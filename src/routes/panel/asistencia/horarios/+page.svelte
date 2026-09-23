<script lang="ts">
    // Horarios del personal.
    //
    // Es la misma pantalla que el POS, contra los mismos endpoints. Se duplica
    // la interfaz y no la logica: las reglas viven en la API
    // (services/asistencia.config), asi que no pueden desfasarse.
    //
    // Lo que hace falta aca y no es obvio es el HORARIO PARA VARIOS: la cocina
    // entera suele entrar a la misma hora, y cargarlo uno por uno son quince
    // formularios identicos donde a la quinta persona alguien se equivoca.
    //
    // Todo cambio queda en la bitacora: el horario es lo que define si alguien
    // llego tarde, asi que cambiarlo hacia atras cambia lo que se le descuenta.

    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { getData, putData, postDataJSON } from '$root/services/httpClient.services';
    import Preload from '$root/components/Preload.svelte';

    const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;
    const DIAS_TXT: Record<string, string> = {
        lun: 'Lunes', mar: 'Martes', mie: 'Miercoles', jue: 'Jueves',
        vie: 'Viernes', sab: 'Sabado', dom: 'Domingo'
    };

    type Tramo = { activo: boolean; e: string; s: string };
    const gridVacio = (h: any = null): Record<string, Tramo> => {
        const g: Record<string, Tramo> = {};
        for (const d of DIAS) {
            const t = h?.[d];
            g[d] = { activo: !!t, e: t?.e || '08:00', s: t?.s || '17:00' };
        }
        return g;
    };

    let isPreloadShow = true;
    let error = '';
    let aviso = '';
    let personal: any[] = [];
    let areas: any[] = [];
    let sinArea = 0;

    // --- seleccion para las acciones de grupo ---
    let sel: Record<number, boolean> = {};
    $: idsSel = personal.filter(c => sel[c.idcolaborador]).map(c => c.idcolaborador);

    // --- edicion individual ---
    let editando: any = null;
    let grid = gridVacio();
    let tolerancia = 10;
    let guardando = false;

    // --- horario para varios ---
    let masivo = false;
    let alcance = 'todos';
    let gridMas = gridVacio();
    let tolMas = 10;

    // --- confirmacion de dejar sin horario ---
    let confirmar: null | { texto: string; titulo: string; accion: () => void } = null;

    onMount(async () => {
        await isLogin();
        await cargar();
        isPreloadShow = false;
    });

    async function cargar() {
        error = '';
        isPreloadShow = true;
        try {
            const [rp, ra] = await Promise.all([
                getData('asistencia-rrhh', 'personal'),
                getData('asistencia-rrhh', 'areas')
            ]);
            if (!rp?.success) { throw new Error(rp?.error || 'No se pudo cargar el personal'); }
            personal = rp.datos.personal;
            if (ra?.success) { areas = ra.datos.areas; sinArea = ra.datos.sin_area; }
        } catch (e: any) {
            error = e.message;
        }
        isPreloadShow = false;
    }

    /** Horario en una linea, agrupando dias seguidos con el mismo tramo. */
    function horarioTexto(h: any): string {
        if (!h || !Object.keys(h).length) { return 'Sin horario'; }
        const partes: string[] = [];
        let i = 0;
        while (i < DIAS.length) {
            const d = DIAS[i], t = h[d];
            if (!t) { i++; continue; }
            let j = i;
            while (j + 1 < DIAS.length) {
                const sig = h[DIAS[j + 1]];
                if (!sig || sig.e !== t.e || sig.s !== t.s) { break; }
                j++;
            }
            const etq = j > i ? `${DIAS_TXT[d].slice(0, 3)}-${DIAS_TXT[DIAS[j]].slice(0, 3)}` : DIAS_TXT[d].slice(0, 3);
            partes.push(`${etq} ${t.e}-${t.s}`);
            i = j + 1;
        }
        return partes.join(' · ') || 'Sin horario';
    }

    /** true si algun tramo cruza medianoche: cambia a que dia pertenece la salida. */
    const cruzaMedianoche = (h: any) => !!h && DIAS.some(d => h[d] && h[d].s <= h[d].e);

    /**
     * Lee un grid y devuelve el horario, o el primer error encontrado.
     * Las mismas validaciones que el POS: si una puerta acepta lo que la otra
     * rechaza, el mismo dato queda distinto segun por donde se cargo.
     */
    function leerGrid(g: Record<string, Tramo>): { horario: any; vacio: boolean; error: string } {
        const horario: any = {};
        let err = '';
        for (const d of DIAS) {
            if (!g[d].activo) { continue; }
            if (!g[d].e || !g[d].s) { err = err || `Falta una hora en ${DIAS_TXT[d]}.`; continue; }
            if (g[d].e === g[d].s) { err = err || `En ${DIAS_TXT[d]} la entrada y la salida son iguales.`; continue; }
            horario[d] = { e: g[d].e, s: g[d].s };
        }
        return { horario, vacio: !Object.keys(horario).length, error: err };
    }

    const tolValida = (t: any) => Number.isFinite(Number(t)) && Number(t) >= 0 && Number(t) <= 240;

    // --- individual ---------------------------------------------------------

    function abrir(c: any) {
        editando = c;
        tolerancia = c.tolerancia_min ?? 10;
        grid = gridVacio(c.horario_semanal);
        aviso = '';
        error = '';
    }

    /** Copia el tramo del primer dia activo a todos los demas activos. */
    function replicar(g: Record<string, Tramo>) {
        const base = DIAS.find(d => g[d].activo);
        if (!base) { return g; }
        for (const d of DIAS) {
            if (g[d].activo) { g[d] = { ...g[d], e: g[base].e, s: g[base].s }; }
        }
        return { ...g };
    }

    async function guardar() {
        const leido = leerGrid(grid);
        if (leido.error) { error = leido.error; return; }
        if (!tolValida(tolerancia)) { error = 'La tolerancia debe estar entre 0 y 240 minutos.'; return; }

        const escribir = async () => {
            guardando = true;
            error = '';
            try {
                const resp = await putData('asistencia-rrhh', `personal/${editando.idcolaborador}/horario`, {
                    horario_semanal: leido.vacio ? null : leido.horario,
                    tolerancia_min: Number(tolerancia)
                });
                const r = await resp.json();
                if (!r?.success) { throw new Error(r?.error || 'No se pudo guardar'); }
                aviso = `Horario de ${editando.nombres} actualizado.`;
                editando = null;
                await cargar();
            } catch (e: any) {
                error = e.message;
            }
            guardando = false;
        };

        if (leido.vacio) {
            confirmar = {
                titulo: 'Dejar a esta persona sin horario?',
                texto: 'Podra marcar entrada y salida, pero no se le contaran tardanzas ni faltas.',
                accion: escribir
            };
            return;
        }
        await escribir();
    }

    // --- para varios --------------------------------------------------------

    function abrirMasivo() {
        gridMas = gridVacio();
        tolMas = 10;
        alcance = idsSel.length ? 'seleccion' : 'todos';
        masivo = true;
        aviso = '';
        error = '';
    }

    /** A cuantos alcanza el alcance elegido. Se calcula aca para poder decirlo ANTES. */
    $: alcanzados = alcance === 'todos' ? personal.length
        : alcance === 'seleccion' ? idsSel.length
        : alcance === 'area:0' ? sinArea
        : personal.filter(c => c.idarea === Number(alcance.split(':')[1])).length;

    async function guardarMasivo() {
        const leido = leerGrid(gridMas);
        if (leido.error) { error = leido.error; return; }
        if (!tolValida(tolMas)) { error = 'La tolerancia debe estar entre 0 y 240 minutos.'; return; }
        if (!alcanzados) { error = 'Ese grupo no tiene a nadie.'; return; }

        const cuerpo: any = {
            horario_semanal: leido.vacio ? null : leido.horario,
            tolerancia_min: Number(tolMas)
        };
        if (alcance.startsWith('area:')) {
            cuerpo.alcance = 'area';
            cuerpo.idarea = Number(alcance.split(':')[1]) || null;
        } else {
            cuerpo.alcance = alcance;
            if (alcance === 'seleccion') { cuerpo.ids = idsSel; }
        }

        confirmar = {
            titulo: 'Aplicar este horario al grupo?',
            texto: leido.vacio
                ? `${alcanzados} persona(s) van a quedar SIN horario: podran marcar, pero no se les contaran tardanzas ni faltas.`
                : `Se reemplaza el horario que cada una de las ${alcanzados} persona(s) tenga ahora. No se puede deshacer.`,
            accion: async () => {
                guardando = true;
                error = '';
                try {
                    const r = await postDataJSON('asistencia-rrhh', 'personal/horario-masivo', cuerpo);
                    if (!r?.success) { throw new Error(r?.error || 'No se pudo aplicar'); }
                    aviso = `Horario aplicado a ${r.datos.actualizados} persona(s).`;
                    masivo = false;
                    sel = {};
                    await cargar();
                } catch (e: any) {
                    error = e.message;
                }
                guardando = false;
            }
        };
    }

    function ejecutarConfirmado() {
        const a = confirmar?.accion;
        confirmar = null;
        a?.();
    }
</script>

<div in:fade class="max-w-5xl m-auto p-4">
    <Preload isLoading={isPreloadShow} />

    <div class="flex items-center justify-between pb-3">
        <div>
            <p class="text-xl font-bold">Horarios del personal</p>
            <p class="text-xs text-neutral-600">
                Define a que hora entra y sale cada persona. Es lo que decide si una marca llego tarde.
            </p>
        </div>
        <div class="flex items-center gap-3">
            <button class="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                    on:click={abrirMasivo}>
                <i class="fa-solid fa-clock"></i> Horario para varios
            </button>
            <button class="btn-link text-sm text-neutral-600 hover:text-black" on:click={() => goto('../asistencia')}>
                <i class="fa-solid fa-arrow-left"></i> Volver
            </button>
        </div>
    </div>

    {#if error && !editando && !masivo}
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
    {/if}
    {#if aviso}
        <div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{aviso}</div>
    {/if}

    {#if idsSel.length}
        <div class="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm">
            <span class="flex-1">{idsSel.length} seleccionado(s)</span>
            <button class="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
                    on:click={abrirMasivo}>Poner horario a los {idsSel.length}</button>
            <button class="btn-link text-sm text-neutral-600 hover:text-black" on:click={() => (sel = {})}>Quitar seleccion</button>
        </div>
    {/if}

    <div class="overflow-x-auto rounded-lg border">
        <table class="w-full text-sm">
            <thead class="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                <tr>
                    <th class="w-8 p-2"></th>
                    <th class="p-2">Colaborador</th>
                    <th class="p-2">Area</th>
                    <th class="p-2">Horario</th>
                    <th class="p-2 text-right">Tolerancia</th>
                    <th class="p-2"></th>
                </tr>
            </thead>
            <tbody>
                {#each personal as c (c.idcolaborador)}
                    <tr class="border-t hover:bg-neutral-50">
                        <td class="p-2"><input type="checkbox" bind:checked={sel[c.idcolaborador]} /></td>
                        <td class="p-2">
                            {c.nombres}
                            <span class="block text-[11px] text-neutral-400">{c.dni || ''}</span>
                        </td>
                        <td class="p-2 text-neutral-500">{c.area || '-'}</td>
                        <td class="p-2">
                            <span class={c.horario_semanal ? '' : 'text-neutral-400'}>
                                {horarioTexto(c.horario_semanal)}
                            </span>
                            {#if cruzaMedianoche(c.horario_semanal)}
                                <span class="block text-[11px] text-amber-600">Cruza medianoche</span>
                            {/if}
                        </td>
                        <td class="p-2 text-right tabular-nums text-neutral-500">{c.tolerancia_min} min</td>
                        <td class="p-2 text-right">
                            <button class="btn-link text-sky-600 hover:underline" on:click={() => abrir(c)}>Editar</button>
                        </td>
                    </tr>
                {:else}
                    <tr><td colspan="6" class="p-6 text-center text-neutral-500">
                        Esta sede todavia no tiene personal cargado. Se importa desde el POS.
                    </td></tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>

<!-- Horario de una persona -->
{#if editando}
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" transition:fade={{ duration: 120 }}>
        <div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div class="border-b p-4">
                <p class="font-semibold">{editando.nombres}</p>
                <p class="text-xs text-neutral-500">
                    Destilda los dias que no trabaja. Si la salida es menor que la entrada, el turno cruza
                    medianoche (ej. 18:00 a 02:00) y se cuenta en el mismo dia.
                </p>
            </div>

            <div class="max-h-[58vh] overflow-y-auto p-4">
                {#if error}
                    <div class="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</div>
                {/if}

                {#each DIAS as d}
                    <div class="flex items-center gap-3 border-b py-2 last:border-0">
                        <label class="flex w-32 items-center gap-2 text-sm">
                            <input type="checkbox" bind:checked={grid[d].activo} />
                            {DIAS_TXT[d]}
                        </label>
                        {#if grid[d].activo}
                            <input type="time" bind:value={grid[d].e} class="rounded-md border px-2 py-1 text-sm" />
                            <span class="text-neutral-400">a</span>
                            <input type="time" bind:value={grid[d].s} class="rounded-md border px-2 py-1 text-sm" />
                            {#if grid[d].s <= grid[d].e}
                                <span class="text-[11px] text-amber-600">sale al dia siguiente</span>
                            {/if}
                        {:else}
                            <span class="text-sm text-neutral-400">Descansa</span>
                        {/if}
                    </div>
                {/each}

                <button class="btn-link mt-3 text-xs text-sky-600 hover:underline" on:click={() => (grid = replicar(grid))}>
                    Usar el mismo horario en todos los dias marcados
                </button>

                <div class="mt-4 flex items-center gap-2">
                    <span class="text-sm">Tolerancia</span>
                    <input type="number" min="0" max="240" bind:value={tolerancia}
                           class="w-20 rounded-md border px-2 py-1 text-sm" />
                    <span class="text-xs text-neutral-500">
                        minutos de gracia antes de contar la tardanza
                    </span>
                </div>
            </div>

            <div class="flex justify-end gap-2 border-t p-4">
                <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                        on:click={() => { editando = null; error = ''; }}>Cancelar</button>
                <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                        disabled={guardando} on:click={guardar}>
                    {guardando ? 'Guardando...' : 'Guardar horario'}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Horario para varios -->
{#if masivo}
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" transition:fade={{ duration: 120 }}>
        <div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div class="border-b p-4">
                <p class="font-semibold">Horario para varios</p>
                <p class="text-xs text-neutral-500">
                    El mismo horario para todo un grupo de una sola vez. Pisa el horario que cada uno tenga ahora.
                </p>
            </div>

            <div class="max-h-[58vh] overflow-y-auto p-4">
                {#if error}
                    <div class="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</div>
                {/if}

                <p class="mb-1 text-[11px] font-semibold uppercase text-neutral-500">Aplicar a</p>
                <select bind:value={alcance} class="mb-3 w-full rounded-md border px-3 py-1.5 text-sm">
                    <option value="todos">Todo el personal de la sede ({personal.length})</option>
                    {#if idsSel.length}
                        <option value="seleccion">Los {idsSel.length} seleccionados</option>
                    {/if}
                    {#each areas as a}
                        {#if a.personal > 0}
                            <option value={'area:' + a.idarea}>Area {a.descripcion} ({a.personal})</option>
                        {/if}
                    {/each}
                    {#if sinArea}
                        <option value="area:0">Los que no tienen area ({sinArea})</option>
                    {/if}
                </select>

                {#each DIAS as d}
                    <div class="flex items-center gap-3 border-b py-2 last:border-0">
                        <label class="flex w-32 items-center gap-2 text-sm">
                            <input type="checkbox" bind:checked={gridMas[d].activo} />
                            {DIAS_TXT[d]}
                        </label>
                        {#if gridMas[d].activo}
                            <input type="time" bind:value={gridMas[d].e} class="rounded-md border px-2 py-1 text-sm" />
                            <span class="text-neutral-400">a</span>
                            <input type="time" bind:value={gridMas[d].s} class="rounded-md border px-2 py-1 text-sm" />
                            {#if gridMas[d].s <= gridMas[d].e}
                                <span class="text-[11px] text-amber-600">sale al dia siguiente</span>
                            {/if}
                        {:else}
                            <span class="text-sm text-neutral-400">Descansa</span>
                        {/if}
                    </div>
                {/each}

                <button class="btn-link mt-3 text-xs text-sky-600 hover:underline" on:click={() => (gridMas = replicar(gridMas))}>
                    Usar el mismo horario en todos los dias marcados
                </button>

                <div class="mt-4 flex items-center gap-2">
                    <span class="text-sm">Tolerancia</span>
                    <input type="number" min="0" max="240" bind:value={tolMas}
                           class="w-20 rounded-md border px-2 py-1 text-sm" />
                    <span class="text-xs text-neutral-500">minutos</span>
                </div>

                <p class="mt-3 rounded-md bg-neutral-50 p-2 text-xs text-neutral-600">
                    Se va a aplicar a <b>{alcanzados}</b> persona(s). Se reemplaza el horario que tengan ahora.
                </p>
            </div>

            <div class="flex justify-end gap-2 border-t p-4">
                <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                        on:click={() => { masivo = false; error = ''; }}>Cancelar</button>
                <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                        disabled={guardando} on:click={guardarMasivo}>
                    {guardando ? 'Aplicando...' : 'Aplicar a todos'}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Confirmacion: solo para lo que no se puede deshacer -->
{#if confirmar}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" transition:fade={{ duration: 120 }}>
        <div class="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div class="border-b p-4">
                <p class="font-semibold">{confirmar.titulo}</p>
            </div>
            <p class="p-4 text-sm text-neutral-700">{confirmar.texto}</p>
            <div class="flex justify-end gap-2 border-t p-4">
                <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                        on:click={() => (confirmar = null)}>Cancelar</button>
                <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                        on:click={ejecutarConfirmado}>Si, continuar</button>
            </div>
        </div>
    </div>
{/if}
