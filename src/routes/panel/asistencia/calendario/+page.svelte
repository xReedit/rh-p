<script lang="ts">
    // Calendario: dias de cierre, feriados y quien trabaja en su dia libre.
    //
    // Es la misma pantalla que tiene el POS, contra los mismos endpoints. Se
    // duplica la interfaz y no la logica: las reglas viven en la API
    // (services/asistencia.config), asi que no pueden desfasarse entre las dos.
    //
    // Lo que se decide aqui termina en la boleta: un dia trabajado en descanso
    // se paga doble si no corre a otra fecha. Por eso al convocar a alguien en
    // su dia libre hay que elegir como se le compensa, y por eso todo queda en
    // la bitacora.

    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { getData, postDataJSON, deleteData } from '$root/services/httpClient.services';
    import Preload from '$root/components/Preload.svelte';

    const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;
    const DIAS_TXT: Record<string, string> = {
        lun: 'Lunes', mar: 'Martes', mie: 'Miercoles', jue: 'Jueves',
        vie: 'Viernes', sab: 'Sabado', dom: 'Domingo'
    };
    const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    let isPreloadShow = true;
    let error = '';
    let aviso = '';

    let mes = '';
    let cal: any = null;

    // --- el dia abierto ---
    let dia: any = null;
    let local: 'normal' | 'abre' | 'cierra' = 'normal';
    let motivo = '';
    let cambios: Record<number, { tipo: string; compensacion: string | null; fecha_sustituto: string | null }> = {};
    let guardando = false;

    // --- como se compensa a quien viene en su dia libre ---
    let compPend: any = null;
    let compTipo = '';
    let compFecha = '';
    // El checkbox que abrio el dialogo. Se guarda porque si se cancela hay que
    // destildarlo a mano: Svelte no reescribe `checked` cuando el valor
    // calculado no cambio, y el tilde que puso el usuario quedaria puesto.
    let compChk: HTMLInputElement | null = null;

    // --- paneles laterales ---
    let panel: '' | 'config' | 'feriados' | 'historial' = '';
    let cierreSel: Record<string, boolean> = {};
    let cfg: any = null;
    let feriados: any[] = [];
    let ferFecha = '';
    let ferTexto = '';
    let historial: any[] = [];

    onMount(async () => {
        await isLogin();
        mes = new Date().toISOString().slice(0, 7);
        await cargar();
        isPreloadShow = false;
    });

    async function cargar() {
        error = '';
        isPreloadShow = true;
        try {
            const r = await getData('asistencia-rrhh', `calendario/${mes}`);
            if (!r?.success) { throw new Error(r?.error || 'No se pudo cargar el mes'); }
            cal = r.datos;
        } catch (e: any) {
            error = e.message;
            cal = null;
        }
        isPreloadShow = false;
    }

    function mover(n: number) {
        const [a, m] = mes.split('-').map(Number);
        mes = new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
        cargar();
    }

    /** Huecos antes del dia 1 para que cada columna caiga bajo su dia. */
    $: hueco = cal ? DIAS.indexOf(cal.dias[0].dia_semana) : 0;

    // --- el dia -------------------------------------------------------------

    async function abrirDia(fecha: string) {
        error = '';
        isPreloadShow = true;
        try {
            const r = await getData('asistencia-rrhh', `calendario/dia/${fecha}`);
            if (!r?.success) { throw new Error(r?.error || 'No se pudo cargar el dia'); }
            dia = r.datos;
            cambios = {};
            const exc = dia.excepcion_sede;
            local = exc ? (exc.tipo === 'LABORABLE' ? 'abre' : 'cierra') : 'normal';
            motivo = exc?.motivo || '';
        } catch (e: any) {
            error = e.message;
        }
        isPreloadShow = false;
    }

    const delMes = (fecha: string) => cal?.dias.find((d: any) => d.fecha === fecha);

    function etiquetaNormal(fecha: string): string {
        const d = delMes(fecha);
        if (!d) { return 'Como siempre'; }
        if (d.feriado) { return 'Como siempre (cerrado por feriado)'; }
        return cal.dias_cierre.includes(d.dia_semana) ? 'Como siempre (cerrado)' : 'Como siempre (abierto)';
    }

    const estadoPersona = (p: any) => {
        const c = cambios[p.idcolaborador];
        return {
            viene: c ? c.tipo === 'LABORABLE' : p.labora,
            extra: c ? !!c.compensacion : p.es_descanso_trabajado,
            comp: c ? c.compensacion : p.compensacion,
            sus: c ? c.fecha_sustituto : p.fecha_sustituto
        };
    };

    /**
     * Tildar a quien NO trabajaba abre la pregunta de como se le paga: es lo
     * unico que la ley obliga a decidir. Destildar, o tildar a quien ya
     * trabajaba, no pregunta nada.
     */
    function tocarPersona(p: any, marcado: boolean, chk: HTMLInputElement) {
        if (!marcado) {
            cambios[p.idcolaborador] = { tipo: 'NO_LABORABLE', compensacion: null, fecha_sustituto: null };
            cambios = cambios;
            return;
        }
        if (p.labora && !p.es_descanso_trabajado) {
            delete cambios[p.idcolaborador];
            cambios = cambios;
            return;
        }
        compPend = p;
        compChk = chk;
        compTipo = '';
        compFecha = '';
    }

    function compCancelar() {
        if (compChk) { compChk.checked = false; }
        compPend = null;
        compChk = null;
    }

    function compOk() {
        if (!compTipo) { error = 'Elige como se le compensa el dia.'; return; }
        if (compTipo === 'SUSTITUTORIO' && !compFecha) { error = 'Elige que dia descansa a cambio.'; return; }
        if (compTipo === 'SUSTITUTORIO' && compFecha === dia.fecha) {
            error = 'No puede descansar el mismo dia que trabaja.'; return;
        }
        error = '';
        cambios[compPend.idcolaborador] = {
            tipo: 'LABORABLE',
            compensacion: compTipo,
            fecha_sustituto: compTipo === 'SUSTITUTORIO' ? compFecha : null
        };
        cambios = cambios;
        compPend = null;
        compChk = null;
    }

    async function guardarDia() {
        if (local !== 'normal' && !motivo.trim()) { error = 'Escribe el motivo del cambio.'; return; }

        // En cadena y no en paralelo: el upsert es por (sede, persona, fecha) y
        // dispararlas juntas puede dejar filas a medias.
        const tareas: Array<() => Promise<any>> = [];

        if (local === 'normal' && dia.idexcepcion_sede) {
            tareas.push(() => deleteData('asistencia-rrhh', `calendario/excepcion/${dia.idexcepcion_sede}`));
        } else if (local !== 'normal') {
            tareas.push(() => postDataJSON('asistencia-rrhh', 'calendario/excepcion', {
                fecha: dia.fecha, idcolaborador: 0,
                tipo: local === 'abre' ? 'LABORABLE' : 'NO_LABORABLE',
                motivo: motivo.trim()
            }));
        }

        for (const [id, c] of Object.entries(cambios)) {
            const p = dia.personal.find((x: any) => x.idcolaborador === Number(id));
            if (!p) { continue; }

            // Volver al estado original = borrar la excepcion, no guardar una igual
            const vuelveANormal = (c.tipo === 'LABORABLE') === p.labora && !c.compensacion;
            if (vuelveANormal && p.idexcepcion) {
                tareas.push(() => deleteData('asistencia-rrhh', `calendario/excepcion/${p.idexcepcion}`));
                continue;
            }
            tareas.push(() => postDataJSON('asistencia-rrhh', 'calendario/excepcion', {
                fecha: dia.fecha, idcolaborador: Number(id), tipo: c.tipo,
                motivo: motivo.trim() || (c.tipo === 'LABORABLE' ? 'Viene en su dia libre' : 'No viene'),
                compensacion: c.compensacion || '',
                fecha_sustituto: c.fecha_sustituto || ''
            }));
        }

        if (!tareas.length) { dia = null; return; }

        guardando = true;
        error = '';
        try {
            for (const t of tareas) {
                const resp: any = await t();
                const r = typeof resp.json === 'function' ? await resp.json() : resp;
                if (!r?.success) { throw new Error(r?.error || 'No se pudo guardar'); }
            }
            aviso = 'Calendario actualizado.';
            dia = null;
            await cargar();
        } catch (e: any) {
            error = e.message;
        }
        guardando = false;
    }

    // --- dias de cierre -----------------------------------------------------

    async function abrirConfig() {
        error = '';
        try {
            const r = await getData('asistencia-rrhh', 'configuracion');
            if (!r?.success) { throw new Error(r?.error || 'No se pudo cargar la configuracion'); }
            cfg = { ...r.datos, feriado_extra: r.datos.feriado_recargo_pct > 0 };
            if (!cfg.feriado_recargo_pct) { cfg.feriado_recargo_pct = 100; }
            cierreSel = {};
            for (const d of DIAS) { cierreSel[d] = r.datos.dias_cierre.includes(d); }
            panel = 'config';
        } catch (e: any) {
            error = e.message;
        }
    }

    function marcarFeriados(v: boolean) {
        cfg.feriados = cfg.feriados.map((f: any) => ({ ...f, labora: v }));
    }

    async function guardarConfig() {
        const dias = DIAS.filter(d => cierreSel[d]);
        if (dias.length === 7) { error = 'No se pueden cerrar los siete dias.'; return; }

        guardando = true;
        error = '';
        try {
            const r = await postDataJSON('asistencia-rrhh', 'configuracion', {
                anio: cfg.anio,
                dias_cierre: dias,
                feriados_labora: cfg.feriados.filter((f: any) => f.labora).map((f: any) => f.fecha),
                feriados_total: cfg.feriados.length,
                // Trabajar un solo feriado al ano tambien se paga con recargo:
                // el extra no depende de cuantos se abran.
                feriado_recargo_pct: cfg.feriado_extra ? Number(cfg.feriado_recargo_pct) : 0,
                descanso_trabajado: cfg.descanso_trabajado,
                descanso_recargo_pct: Number(cfg.descanso_recargo_pct)
            });
            if (!r?.success) { throw new Error(r?.error || 'No se pudo guardar'); }
            aviso = 'Configuracion guardada.';
            panel = '';
            await cargar();
        } catch (e: any) {
            error = e.message;
        }
        guardando = false;
    }

    // --- feriados -----------------------------------------------------------

    async function abrirFeriados() {
        error = '';
        try {
            const r = await getData('asistencia-rrhh', `feriados/${mes.slice(0, 4)}`);
            if (!r?.success) { throw new Error(r?.error || 'No se pudieron cargar los feriados'); }
            feriados = r.datos.feriados;
            ferFecha = '';
            ferTexto = '';
            panel = 'feriados';
        } catch (e: any) {
            error = e.message;
        }
    }

    async function agregarFeriado() {
        if (!ferFecha || !ferTexto.trim()) { error = 'Pon la fecha y el nombre del feriado.'; return; }
        error = '';
        try {
            const r = await postDataJSON('asistencia-rrhh', 'feriados', { fecha: ferFecha, descripcion: ferTexto.trim() });
            if (!r?.success) { throw new Error(r?.error || 'No se pudo guardar'); }
            await abrirFeriados();
            await cargar();
        } catch (e: any) {
            error = e.message;
        }
    }

    async function quitarFeriado(f: any) {
        error = '';
        try {
            const resp = await deleteData('asistencia-rrhh', `feriados/${f.idferiado}`);
            const r = await resp.json();
            if (!r?.success) { throw new Error(r?.error || 'No se pudo quitar'); }
            await abrirFeriados();
            await cargar();
        } catch (e: any) {
            error = e.message;
        }
    }

    // --- historial ----------------------------------------------------------

    async function abrirHistorial() {
        error = '';
        try {
            const r = await getData('asistencia-rrhh', 'bitacora');
            if (!r?.success) { throw new Error(r?.error || 'No se pudo cargar el historial'); }
            historial = r.datos.cambios;
            panel = 'historial';
        } catch (e: any) {
            error = e.message;
        }
    }
</script>

<div in:fade class="max-w-5xl m-auto p-4">
    <Preload isLoading={isPreloadShow} />

    <div class="flex items-center justify-between pb-3">
        <div>
            <p class="text-xl font-bold">Calendario</p>
            <p class="text-xs text-neutral-600">
                Dias que el local no abre, feriados y quien viene en su dia libre. Afecta las faltas y lo que se paga.
            </p>
        </div>
        <button class="btn-link text-sm text-neutral-600 hover:text-black" on:click={() => goto('../asistencia')}>
            <i class="fa-solid fa-arrow-left"></i> Volver
        </button>
    </div>

    {#if error}
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
    {/if}
    {#if aviso}
        <div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{aviso}</div>
    {/if}

    {#if cal}
        <div class="mb-4 flex flex-wrap items-center gap-2 rounded-lg border bg-neutral-50 p-3">
            <button class="rounded-md border bg-white px-3 py-1 text-sm" on:click={() => mover(-1)}>‹</button>
            <span class="min-w-[9rem] text-center text-sm font-semibold">
                {MESES[Number(mes.slice(5, 7)) - 1]} {mes.slice(0, 4)}
            </span>
            <button class="rounded-md border bg-white px-3 py-1 text-sm" on:click={() => mover(1)}>›</button>

            <span class="flex-1"></span>
            <button class="rounded-md border bg-white px-3 py-1 text-sm" on:click={abrirConfig}>Configuracion</button>
            <button class="rounded-md border bg-white px-3 py-1 text-sm" on:click={abrirFeriados}>Feriados</button>
            <button class="rounded-md border bg-white px-3 py-1 text-sm" on:click={abrirHistorial}>Historial</button>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-neutral-500">
            {#each DIAS as d}<span>{DIAS_TXT[d].slice(0, 3)}</span>{/each}
        </div>

        <div class="mt-1 grid grid-cols-7 gap-1">
            {#each Array(hueco) as _}<div></div>{/each}
            {#each cal.dias as d (d.fecha)}
                <button
                    class="flex min-h-[72px] flex-col gap-0.5 rounded-md border p-1.5 text-left hover:border-neutral-400
                           {d.abre ? 'bg-white' : 'bg-neutral-100'}
                           {d.feriado ? 'border-amber-300 bg-amber-50' : ''}
                           {d.excepcion ? 'border-sky-400' : ''}"
                    on:click={() => abrirDia(d.fecha)}>
                    <span class="text-sm font-semibold {d.abre ? '' : 'text-neutral-400'}">
                        {Number(d.fecha.slice(8))}
                    </span>
                    {#if d.feriado}
                        <span class="text-[10px] leading-tight text-neutral-500">{d.feriado}</span>
                    {/if}
                    {#if d.excepcion}
                        <span class="text-[10px] font-semibold leading-tight text-sky-700">{d.excepcion.motivo}</span>
                    {/if}
                    {#if d.personas_con_excepcion}
                        <span class="mt-auto self-start rounded-full bg-sky-100 px-1.5 text-[10px] font-semibold text-sky-700">
                            {d.personas_con_excepcion}
                        </span>
                    {/if}
                </button>
            {/each}
        </div>

        <p class="mt-3 text-[11px] text-neutral-500">
            Gris: el local no abre · Ambar: feriado · Borde azul: ese dia tiene una excepcion cargada
        </p>
    {/if}
</div>

<!-- El dia -->
{#if dia}
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" transition:fade={{ duration: 120 }}>
        <div class="w-full max-w-xl rounded-xl bg-white shadow-xl">
            <div class="border-b p-4">
                <p class="font-semibold">
                    {DIAS_TXT[delMes(dia.fecha)?.dia_semana] || ''} {Number(dia.fecha.slice(8))} de
                    {MESES[Number(dia.fecha.slice(5, 7)) - 1]}
                </p>
                <p class="text-xs text-neutral-500">
                    {dia.feriado ? 'Feriado: ' + dia.feriado : (delMes(dia.fecha)?.abre ? 'El local abre este dia' : 'El local no abre este dia')}
                </p>
            </div>

            <div class="max-h-[62vh] overflow-y-auto p-4">
                <p class="mb-2 text-sm font-semibold">El local</p>
                <label class="flex items-center gap-2 py-1 text-sm">
                    <input type="radio" bind:group={local} value="normal" /> {etiquetaNormal(dia.fecha)}
                </label>
                <label class="flex items-center gap-2 py-1 text-sm">
                    <input type="radio" bind:group={local} value="abre" /> Abrir este dia
                </label>
                <label class="flex items-center gap-2 py-1 text-sm">
                    <input type="radio" bind:group={local} value="cierra" /> Cerrar este dia
                </label>
                {#if local !== 'normal'}
                    <input type="text" bind:value={motivo} maxlength="200"
                           placeholder="Motivo: Fiestas Patrias, Dia del Pollo a la Brasa, fumigacion..."
                           class="mt-2 w-full rounded-md border px-3 py-1.5 text-sm" />
                {/if}

                <p class="mb-1 mt-5 text-sm font-semibold">El personal</p>
                <p class="mb-2 text-xs text-neutral-500">
                    Tilda a quien venga en su dia libre. A los que ya les toca trabajar no hace falta tocarlos.
                </p>

                {#each dia.personal as p (p.idcolaborador)}
                    {@const st = estadoPersona(p)}
                    <label class="flex items-center gap-2 border-b py-2 text-sm last:border-0">
                        <input type="checkbox" checked={st.viene}
                               on:change={(e) => tocarPersona(p, e.currentTarget.checked, e.currentTarget)} />
                        <span class="flex-1">{p.nombres}</span>
                        {#if st.extra}
                            {#if st.comp === 'RECARGO'}
                                <span class="text-[11px] font-semibold text-amber-700">se paga doble</span>
                            {:else if st.comp === 'SUSTITUTORIO'}
                                <span class="text-[11px] font-semibold text-sky-700">descansa el {st.sus}</span>
                            {:else}
                                <span class="text-[11px] font-semibold text-red-600">falta elegir como se paga</span>
                            {/if}
                        {:else if !st.viene}
                            <span class="text-[11px] text-neutral-500">{p.motivo || 'No trabaja'}</span>
                        {:else if p.hora_esperada}
                            <span class="text-[11px] text-neutral-500">entra {p.hora_esperada.slice(0, 5)}</span>
                        {/if}
                    </label>
                {/each}
            </div>

            <div class="flex justify-end gap-2 border-t p-4">
                <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                        on:click={() => (dia = null)}>Cerrar</button>
                <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                        disabled={guardando} on:click={guardarDia}>
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </div>
    </div>
{/if}

<!-- Como se le compensa -->
{#if compPend}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" transition:fade={{ duration: 120 }}>
        <div class="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div class="border-b p-4">
                <p class="font-semibold">{compPend.nombres} viene en su dia libre</p>
                <p class="text-xs text-neutral-500">
                    La ley pide elegir una de las dos. Si descansa otro dia no hay recargo; si no, el dia se paga doble.
                </p>
            </div>
            <div class="p-4">
                <label class="flex items-center gap-2 py-1 text-sm">
                    <input type="radio" bind:group={compTipo} value="SUSTITUTORIO" /> Descansa otro dia
                </label>
                {#if compTipo === 'SUSTITUTORIO'}
                    <input type="date" bind:value={compFecha} class="ml-6 rounded-md border px-2 py-1 text-sm" />
                {/if}
                <label class="flex items-center gap-2 py-1 text-sm">
                    <input type="radio" bind:group={compTipo} value="RECARGO" /> Se le paga doble
                </label>
                {#if compTipo === 'RECARGO'}
                    <p class="ml-6 text-[11px] text-neutral-500">
                        Se le paga el dia con 100% de recargo. Entra solo a la boleta.
                    </p>
                {/if}
            </div>
            <div class="flex justify-end gap-2 border-t p-4">
                <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                        on:click={compCancelar}>Cancelar</button>
                <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                        on:click={compOk}>Listo</button>
            </div>
        </div>
    </div>
{/if}

<!-- Paneles: cierre, feriados, historial -->
{#if panel}
    <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" transition:fade={{ duration: 120 }}>
        <div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
            {#if panel === 'config' && cfg}
                <div class="border-b p-4">
                    <p class="font-semibold">Como trabaja el local</p>
                    <p class="text-xs text-neutral-500">
                        Tres preguntas. Con esto contestado el marcador se maneja solo y no hay que tocar el calendario todos los dias.
                    </p>
                </div>
                <div class="max-h-[62vh] overflow-y-auto p-4">

                    <p class="mb-2 text-sm font-semibold">1. Que dias no abre el local</p>
                    <div class="grid grid-cols-2 gap-2">
                        {#each DIAS as d}
                            <label class="flex items-center gap-2 text-sm">
                                <input type="checkbox" bind:checked={cierreSel[d]} /> {DIAS_TXT[d]}
                            </label>
                        {/each}
                    </div>
                    <p class="mt-2 text-xs text-neutral-500">
                        Sin marcar ninguno, abre todos los dias. Un dia de cierre no le genera falta a nadie.
                    </p>

                    <p class="mb-1 mt-5 text-sm font-semibold">2. Que feriados se trabajan</p>
                    <p class="mb-2 text-xs text-neutral-500">
                        Marca los que si se trabaja. Los que queden sin marcar el marcador los trata como dia cerrado.
                    </p>
                    <div class="mb-2 flex items-center gap-2">
                        <span class="text-xs font-semibold">Feriados {cfg.anio}</span>
                        <span class="flex-1"></span>
                        <button class="rounded-md border px-2 py-0.5 text-xs hover:bg-neutral-50"
                                on:click={() => marcarFeriados(true)}>Marcar todos</button>
                        <button class="rounded-md border px-2 py-0.5 text-xs hover:bg-neutral-50"
                                on:click={() => marcarFeriados(false)}>Ninguno</button>
                    </div>
                    <div class="max-h-60 overflow-y-auto rounded-md border">
                        {#each cfg.feriados as f (f.idferiado)}
                            <label class="flex items-center gap-2 border-b px-2 py-1.5 text-sm last:border-0 hover:bg-neutral-50">
                                <input type="checkbox" bind:checked={f.labora} />
                                <span class="w-14 shrink-0 text-xs tabular-nums text-neutral-500">{f.fecha.slice(5)}</span>
                                <span class="flex-1 truncate">{f.descripcion}</span>
                                {#if f.propio}<span class="text-[10px] text-sky-700">propio</span>{/if}
                            </label>
                        {:else}
                            <p class="p-4 text-center text-xs text-neutral-500">No hay feriados cargados para este ano.</p>
                        {/each}
                    </div>
                    <label class="mt-3 flex items-center gap-2 py-1 text-sm">
                        <input type="checkbox" bind:checked={cfg.feriado_extra} /> Al que trabaja un feriado se le paga extra
                    </label>
                    {#if cfg.feriado_extra}
                        <div class="ml-6 flex items-center gap-2">
                            <input type="number" min="0" max="300" bind:value={cfg.feriado_recargo_pct}
                                   class="w-20 rounded-md border px-2 py-1 text-sm" />
                            <span class="text-xs text-neutral-500">% adicional</span>
                        </div>
                    {/if}

                    <p class="mb-2 mt-5 text-sm font-semibold">3. Si alguien viene a trabajar en su dia de descanso</p>
                    <label class="flex items-center gap-2 py-1 text-sm">
                        <input type="radio" bind:group={cfg.descanso_trabajado} value="PERMISO" /> Hay que pedir permiso al administrador
                    </label>
                    <label class="flex items-center gap-2 py-1 text-sm">
                        <input type="radio" bind:group={cfg.descanso_trabajado} value="RECARGO" /> Puede marcar y se le paga doble
                    </label>
                    {#if cfg.descanso_trabajado === 'RECARGO'}
                        <div class="ml-6 flex items-center gap-2">
                            <input type="number" min="100" max="300" bind:value={cfg.descanso_recargo_pct}
                                   class="w-20 rounded-md border px-2 py-1 text-sm" />
                            <span class="text-xs text-neutral-500">% adicional</span>
                        </div>
                    {/if}
                    <p class="mt-2 text-xs text-neutral-500">
                        {cfg.descanso_trabajado === 'RECARGO'
                            ? 'El marcador acepta la marca y la registra como dia pagado doble. Entra a la boleta sin que nadie haga nada.'
                            : 'El marcador rechaza la marca y avisa que hay que habilitar el dia. Lo habilita el administrador desde el propio marcador o desde aqui.'}
                    </p>
                </div>
                <div class="flex justify-end gap-2 border-t p-4">
                    <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                            on:click={() => (panel = '')}>Cancelar</button>
                    <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                            disabled={guardando} on:click={guardarConfig}>Guardar</button>
                </div>

            {:else if panel === 'feriados'}
                <div class="border-b p-4">
                    <p class="font-semibold">Feriados {mes.slice(0, 4)}</p>
                    <p class="text-xs text-neutral-500">
                        Los nacionales vienen cargados. Aqui se agregan los propios: aniversario del local, feriado regional.
                    </p>
                </div>
                <div class="max-h-[50vh] overflow-y-auto p-4">
                    {#each feriados as f (f.idferiado)}
                        <div class="flex items-center gap-2 border-b py-1.5 text-sm last:border-0">
                            <span class="w-24 tabular-nums text-neutral-500">{f.fecha}</span>
                            <span class="flex-1">{f.descripcion}</span>
                            {#if f.propio}
                                <button class="text-xs text-red-600 hover:underline" on:click={() => quitarFeriado(f)}>Quitar</button>
                            {:else}
                                <span class="text-[11px] text-neutral-400">nacional</span>
                            {/if}
                        </div>
                    {/each}

                    <div class="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
                        <input type="date" bind:value={ferFecha} class="rounded-md border px-2 py-1 text-sm" />
                        <input type="text" bind:value={ferTexto} maxlength="120" placeholder="Nombre del feriado"
                               class="flex-1 rounded-md border px-3 py-1 text-sm" />
                        <button class="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
                                on:click={agregarFeriado}>Agregar</button>
                    </div>
                </div>
                <div class="flex justify-end border-t p-4">
                    <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                            on:click={() => (panel = '')}>Cerrar</button>
                </div>

            {:else}
                <div class="border-b p-4">
                    <p class="font-semibold">Historial de cambios</p>
                    <p class="text-xs text-neutral-500">
                        Quien cambio que y cuando, desde el POS o desde aqui.
                    </p>
                </div>
                <div class="max-h-[60vh] overflow-y-auto p-4">
                    {#each historial as h (h.idbitacora)}
                        <div class="flex gap-3 border-b py-2 text-sm last:border-0">
                            <span class="w-24 shrink-0 tabular-nums text-xs text-neutral-500">{(h.fecha || '').slice(5, 16)}</span>
                            <span class="flex-1">
                                {h.detalle}
                                <span class="block text-[11px] text-neutral-400">
                                    {h.usuario || 'sistema'}{h.autorizado_por ? ' · autorizado por ' + h.autorizado_por : ''} · {h.origen}
                                </span>
                            </span>
                        </div>
                    {:else}
                        <p class="p-6 text-center text-neutral-500">Todavia no hay cambios registrados.</p>
                    {/each}
                </div>
                <div class="flex justify-end border-t p-4">
                    <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                            on:click={() => (panel = '')}>Cerrar</button>
                </div>
            {/if}
        </div>
    </div>
{/if}
