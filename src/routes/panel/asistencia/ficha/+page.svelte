<script lang="ts">
    // El mes de una persona, dia por dia.
    //
    // POR QUE UN CALENDARIO Y NO UNA TABLA
    // La pregunta que se contesta aqui es "que paso el martes 10", y viene de
    // alguien que esta reclamando un descuento. Un calendario con colores se
    // lee de un vistazo; una tabla de treinta filas hay que recorrerla entera
    // buscando el dia.
    //
    // Y EL DINERO AL LADO
    // El numero y el motivo, juntos. Un descuento sin el dia que lo origino no
    // se puede discutir, y el que tiene que explicarlo es quien atiende al
    // trabajador.

    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { fade } from 'svelte/transition';
    import { getData, postDataJSON } from '$root/services/httpClient.services';
    import Preload from '$root/components/Preload.svelte';

    let isPreloadShow = true;
    let error = '';

    let idcolaborador = 0;
    let personal: any[] = [];
    let periodo = '';
    let periodos: any[] = [];
    let ficha: any = null;
    let cargando = false;

    onMount(async () => {
        if (!isLogin()) { goto('/'); return; }
        idcolaborador = Number($page.url.searchParams.get('id')) || 0;

        await Promise.all([cargarPersonal(), cargarPeriodos()]);
        isPreloadShow = false;

        if (!idcolaborador && personal.length) { idcolaborador = personal[0].idcolaborador; }
        if (idcolaborador) { await cargar(); }
    });

    async function cargarPersonal() {
        try {
            const r = await getData('asistencia-rrhh', 'personal');
            if (r?.success) { personal = r.datos.personal || []; }
        } catch (e: any) { error = e.message; }
    }

    async function cargarPeriodos() {
        try {
            const r = await getData('asistencia-rrhh', 'planilla/configuracion');
            if (r?.success) {
                periodos = r.datos.periodos || [];
                periodo = periodos.length ? periodos[0].clave : '';
            }
        } catch (e: any) { error = e.message; }
    }

    async function cargar() {
        if (!idcolaborador) { return; }
        cargando = true;
        error = '';
        try {
            const r = await postDataJSON('asistencia-rrhh', 'asistencia/ficha',
                { idcolaborador, periodo });
            if (!r?.success) { throw new Error(r?.error || 'No se pudo cargar'); }
            ficha = r.datos;
        } catch (e: any) {
            error = e.message;
            ficha = null;
        }
        cargando = false;
    }

    // --- el calendario ------------------------------------------------------

    const DIAS_CAB = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    /**
     * Cuantas celdas vacias van antes del dia 1.
     *
     * La semana arranca en lunes, pero getUTCDay() cuenta desde el domingo: sin
     * este corrimiento, todo el mes queda un dia desfasado.
     */
    $: huecos = ficha
        ? (new Date(ficha.desde + 'T00:00:00Z').getUTCDay() + 6) % 7
        : 0;

    const COLOR: Record<string, string> = {
        ASISTIO:     'bg-emerald-500 text-white',
        TARDANZA:    'bg-amber-500 text-white',
        FALTA:       'bg-red-500 text-white',
        SIN_SALIDA:  'bg-orange-400 text-white',
        JUSTIFICADO: 'bg-sky-500 text-white',
        DESCANSO:    'bg-neutral-200 text-neutral-500',
        PENDIENTE:   'bg-white text-neutral-400 border border-dashed'
    };

    const TITULO: Record<string, string> = {
        ASISTIO: 'Asistio', TARDANZA: 'Tardanza', FALTA: 'Falta',
        SIN_SALIDA: 'Entro y no marco salida', JUSTIFICADO: 'Justificado',
        DESCANSO: 'Descanso', PENDIENTE: 'Todavia no cierra'
    };

    /** Lo que se ve al pasar el mouse: el dia entero en una linea. */
    function detalle(d: any): string {
        const p = [`${d.fecha} - ${TITULO[d.estado]}`];
        if (d.entrada) { p.push(`Entrada ${d.entrada}${d.salida ? ' · Salida ' + d.salida : ''}`); }
        if (d.tardanza_min) { p.push(`${d.tardanza_min} min tarde`); }
        if (d.horas) { p.push(`${d.horas} h trabajadas`); }
        if (d.sobretiempo_min) { p.push(`${d.sobretiempo_min} min extra`); }
        if (d.feriado) { p.push(`Feriado: ${d.feriado}`); }
        if (d.descanso_trabajado) { p.push('Vino en su dia de descanso'); }
        if (d.motivo) { p.push(d.motivo); }
        return p.join('\n');
    }

    const soles = (n: number) =>
        'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const horasTxt = (min: number) => {
        if (!min) { return '0 h'; }
        const h = Math.floor(min / 60), m = min % 60;
        return m ? `${h}.${Math.round(m / 6)} h` : `${h} h`;
    };

    /** Solo los estados que de verdad aparecen este mes. */
    $: leyenda = ficha
        ? ['ASISTIO', 'TARDANZA', 'FALTA', 'SIN_SALIDA', 'JUSTIFICADO', 'DESCANSO', 'PENDIENTE']
            .filter(e => ficha.dias.some((d: any) => d.estado === e))
        : [];
</script>

<svelte:head><title>Asistencia por trabajador</title></svelte:head>

<div in:fade class="p-5">
    <Preload isLoading={isPreloadShow} />

    <div class="mb-4 flex items-start justify-between">
        <div>
            <h1 class="text-xl font-bold">Asistencia por trabajador</h1>
            <p class="text-xs text-neutral-600">El mes dia por dia, y de donde sale cada descuento.</p>
        </div>
        <a class="btn-link text-sm text-neutral-600 hover:underline" href="/panel/asistencia">&larr; Volver</a>
    </div>

    {#if error}
        <div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
    {/if}

    <div class="mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-3">
        <div>
            <label class="mb-1 block text-[11px] font-semibold uppercase text-neutral-500" for="col">Trabajador</label>
            <select id="col" bind:value={idcolaborador} on:change={cargar}
                    class="rounded-md border px-2 py-1.5 text-sm">
                {#each personal as p}
                    <option value={p.idcolaborador}>{p.nombres} {p.apellidos || ''}</option>
                {/each}
            </select>
        </div>
        <div>
            <label class="mb-1 block text-[11px] font-semibold uppercase text-neutral-500" for="per">Periodo</label>
            <select id="per" bind:value={periodo} on:change={cargar}
                    class="rounded-md border px-2 py-1.5 text-sm">
                {#each periodos as p}
                    <option value={p.clave}>{p.etiqueta}</option>
                {/each}
            </select>
        </div>
        {#if cargando}<span class="pb-2 text-xs text-neutral-500">Cargando...</span>{/if}
    </div>

    {#if ficha}
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">

            <!-- el calendario -->
            <div class="rounded-xl border bg-white p-5">
                <p class="text-[11px] uppercase tracking-wide text-neutral-500">Asistencia</p>
                <p class="text-lg font-bold">{ficha.colaborador.nombres} &middot; {ficha.periodo}</p>

                <div class="mt-4 grid grid-cols-7 gap-2">
                    {#each DIAS_CAB as d}
                        <div class="pb-1 text-center text-xs font-medium text-neutral-400">{d}</div>
                    {/each}

                    {#each Array(huecos) as _}
                        <div></div>
                    {/each}

                    {#each ficha.dias as d}
                        <div class="flex aspect-square items-center justify-center rounded-lg text-sm font-semibold {COLOR[d.estado]}"
                             title={detalle(d)}>
                            {d.dia}
                        </div>
                    {/each}
                </div>

                <div class="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-neutral-600">
                    {#each leyenda as e}
                        <span class="flex items-center gap-1.5">
                            <span class="inline-block h-2.5 w-2.5 rounded-full {COLOR[e]}"></span>
                            {TITULO[e]}
                        </span>
                    {/each}
                </div>
            </div>

            <!-- los numeros -->
            <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <div class="rounded-xl border bg-white p-4">
                        <p class="text-3xl font-bold text-emerald-600">{ficha.resumen.trabajados}</p>
                        <p class="text-xs text-neutral-600">Dias trabajados</p>
                    </div>
                    <div class="rounded-xl border bg-white p-4">
                        <p class="text-3xl font-bold text-red-600">{ficha.resumen.no_trabajados}</p>
                        <p class="text-xs text-neutral-600">Dias no trabajados</p>
                    </div>
                    <div class="rounded-xl border bg-white p-4">
                        <p class="text-3xl font-bold text-amber-600">{ficha.resumen.tardanzas}</p>
                        <p class="text-xs text-neutral-600">
                            <!-- El espacio va DENTRO del bloque: Svelte recorta el
                                 que queda justo antes de un {#if}. -->
                            Tardanzas{#if ficha.resumen.tardanza_min}&nbsp;&middot; {ficha.resumen.tardanza_min} min{/if}
                        </p>
                    </div>
                    <div class="rounded-xl border bg-white p-4">
                        <p class="text-3xl font-bold text-violet-600">{horasTxt(ficha.resumen.sobretiempo_min)}</p>
                        <p class="text-xs text-neutral-600">Horas extra</p>
                    </div>
                </div>

                <div class="rounded-xl border bg-white p-4">
                    <p class="mb-2 font-semibold">Calculo del mes</p>

                    {#if ficha.colaborador.sin_contrato}
                        <p class="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                            Sin contrato cargado: no se puede calcular cuanto vale su dia,
                            asi que no hay descuentos ni pagos que mostrar.
                        </p>
                    {:else}
                        <div class="flex items-center justify-between border-b border-dashed py-2 text-sm">
                            <span>Descuento por tardanzas</span>
                            <span class="tabular-nums font-medium {ficha.calculo.desc_tardanza ? 'text-amber-600' : 'text-neutral-400'}">
                                {ficha.calculo.desc_tardanza ? '- ' + soles(ficha.calculo.desc_tardanza) : '-'}
                            </span>
                        </div>
                        <div class="flex items-center justify-between border-b border-dashed py-2 text-sm">
                            <span>Descuento por faltas</span>
                            <span class="tabular-nums font-medium {ficha.calculo.desc_faltas ? 'text-red-600' : 'text-neutral-400'}">
                                {ficha.calculo.desc_faltas ? '- ' + soles(ficha.calculo.desc_faltas) : '-'}
                            </span>
                        </div>
                        <div class="flex items-center justify-between border-b border-dashed py-2 text-sm">
                            <span>
                                Pago de horas extra
                                {#if ficha.resumen.sobretiempo_min && !ficha.calculo.sobretiempo_se_paga}
                                    <span class="block text-[11px] text-neutral-500">
                                        registradas, pero el pago no esta activado
                                    </span>
                                {/if}
                            </span>
                            <span class="tabular-nums font-medium {ficha.calculo.pago_sobretiempo ? 'text-violet-700' : 'text-neutral-400'}">
                                {ficha.calculo.pago_sobretiempo ? '+ ' + soles(ficha.calculo.pago_sobretiempo) : '-'}
                            </span>
                        </div>

                        <div class="flex items-center justify-between pt-2 text-sm font-semibold">
                            <span>
                                {#if ficha.calculo.listo}
                                    Listo para planilla
                                {:else if ficha.en_curso}
                                    El periodo no cerro
                                {:else}
                                    Falta resolver algo
                                {/if}
                            </span>
                            {#if ficha.calculo.listo}
                                <span class="text-emerald-600">&check;</span>
                            {:else}
                                <span class="text-amber-600">&hellip;</span>
                            {/if}
                        </div>

                        {#if !ficha.calculo.listo && !ficha.en_curso}
                            <p class="mt-1 text-[11px] text-neutral-500">
                                Hay dias con entrada y sin salida. No se sabe cuanto trabajo esos
                                dias, y eso hay que aclararlo antes de pagar.
                            </p>
                        {/if}
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
