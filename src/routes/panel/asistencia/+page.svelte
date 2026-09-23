<script lang="ts">
    // Control de Asistencia, lado Recursos Humanos.
    //
    // Las marcas las toma el POS (QR rotativo en el marcador, celular enrolado).
    // Aqui SOLO se leen: es el dato que despues alimenta el descuento por
    // tardanza en la boleta. Corregir una marca se hace en el marcador, con
    // usuario y clave; si tambien se pudiera desde aqui habria dos caminos y
    // uno de ellos sin esa compuerta.

    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { getData } from '$root/services/httpClient.services';
    import Preload from '$root/components/Preload.svelte';
    import AlertaAusencias from '$root/components/AlertaAusencias.svelte';

    let isPreloadShow = true;
    let vista: 'dia' | 'rango' = 'dia';
    let error = '';

    // --- un dia ---
    let fechaDia = '';
    let dia: any = null;

    // --- rango ---
    let desde = '';
    let hasta = '';
    let reporte: any = null;
    let expandido: number | null = null;

    const hoyIso = () => new Date().toISOString().slice(0, 10);

    onMount(async () => {
        await isLogin();
        const h = hoyIso();
        fechaDia = h;
        hasta = h;
        // Por defecto el mes en curso: es el periodo con el que se arma la planilla
        desde = h.slice(0, 8) + '01';
        await cargarDia();
        isPreloadShow = false;
    });

    function goBack() { goto('../panel'); }

    async function cargarDia() {
        error = '';
        isPreloadShow = true;
        try {
            const r = await getData('asistencia-rrhh', `dia/${fechaDia}`);
            if (!r || !r.success) { throw new Error(r?.error || 'No se pudo cargar el dia'); }
            dia = r.datos;
        } catch (e: any) {
            error = e.message;
            dia = null;
        }
        isPreloadShow = false;
    }

    async function cargarRango() {
        error = '';
        if (desde > hasta) { error = 'La fecha inicial es posterior a la final.'; return; }
        isPreloadShow = true;
        try {
            const r = await getData('asistencia-rrhh', `reporte/${desde}/${hasta}`);
            if (!r || !r.success) { throw new Error(r?.error || 'No se pudo cargar el reporte'); }
            reporte = r.datos;
            expandido = null;
        } catch (e: any) {
            error = e.message;
            reporte = null;
        }
        isPreloadShow = false;
    }

    async function verRango() {
        vista = 'rango';
        if (!reporte) { await cargarRango(); }
    }

    function minutosATexto(min: number) {
        if (!min) { return '0'; }
        if (min < 60) { return `${min} min`; }
        const h = Math.floor(min / 60);
        return `${h} h ${min % 60} min`;
    }

    const ESTADOS: any = {
        COMPLETO:    { txt: 'Completo',     clase: 'text-green-700' },
        PRESENTE:    { txt: 'Presente',     clase: 'text-green-700' },
        INCOMPLETO:  { txt: 'Sin salida',   clase: 'text-red-600' },
        FALTA:       { txt: 'Falta',        clase: 'text-red-600 font-semibold' },
        PENDIENTE:   { txt: 'No llego aun', clase: 'text-neutral-400' },
        LIBRE:       { txt: 'Dia libre',    clase: 'text-neutral-400' },
        SIN_HORARIO: { txt: 'Sin horario',  clase: 'text-neutral-400' }
    };

    /**
     * Descarga el reporte como CSV.
     *
     * BOM + punto y coma + CRLF: sin el BOM, Excel en Windows abre las tildes
     * como basura; con coma como separador parte los decimales en dos columnas
     * porque la configuracion regional usa coma decimal.
     */
    function descargarCsv() {
        if (!reporte) { return; }

        const cab = ['Colaborador', 'DNI', 'Area', 'Dias esperados', 'Asistencias',
                     'Tardanzas', 'Minutos tarde', 'Faltas', 'Dias sin salida',
                     'Marcas manuales', 'Horas trabajadas'];

        const limpiar = (v: any) => {
            const s = (v === null || v === undefined) ? '' : String(v);
            // El separador dentro de un campo romperia las columnas
            return s.replace(/[;\r\n]/g, ' ');
        };

        const lineas = [cab.join(';')];
        for (const f of reporte.filas) {
            lineas.push([
                limpiar(f.nombres), limpiar(f.dni), limpiar(f.area),
                f.dias_esperados, f.asistencias, f.tardanzas, f.tardanza_min_total,
                f.faltas, f.dias_incompletos, f.marcas_manuales,
                // Coma decimal, que es lo que espera el Excel en espanol
                String(f.horas_trabajadas).replace('.', ',')
            ].join(';'));
        }

        const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `asistencia_${reporte.desde}_a_${reporte.hasta}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    }
</script>

<div in:fade class="max-w-6xl m-auto p-4">
    <Preload isLoading={isPreloadShow} />

    <div class="flex items-center justify-between pb-3">
        <div>
            <p class="text-xl font-bold">Control de Asistencia</p>
            <p class="text-xs text-neutral-600">
                Las marcas las registra el personal desde el POS. Aqui se consultan para la planilla.
            </p>
        </div>
        <div class="flex items-center gap-3">
            <button class="rounded-md border px-3 py-1 text-sm hover:bg-neutral-50"
                    on:click={() => goto('asistencia/horarios')}>Horarios</button>
            <button class="rounded-md border px-3 py-1 text-sm hover:bg-neutral-50"
                    on:click={() => goto('asistencia/calendario')}>Calendario</button>
            <button class="rounded-md border px-3 py-1 text-sm hover:bg-neutral-50"
                    on:click={() => goto('asistencia/ausencias')}>Ausencias</button>
            <button class="rounded-md bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
                    on:click={() => goto('asistencia/planilla')}>A la boleta</button>
            <button class="btn-link text-sm text-neutral-600 hover:text-black" on:click={goBack}>
                <i class="fa-solid fa-arrow-left"></i> Volver
            </button>
        </div>
    </div>

    <!-- Dos vistas, un control segmentado: el dia para el seguimiento diario,
         el rango para cerrar la planilla -->
    <div class="inline-flex bg-neutral-100 rounded-lg p-1 mb-4">
        <button class="px-4 py-1.5 text-sm font-medium rounded-md {vista === 'dia' ? 'bg-white shadow-sm' : 'text-neutral-500'}"
                on:click={() => (vista = 'dia')}>Por dia</button>
        <button class="px-4 py-1.5 text-sm font-medium rounded-md {vista === 'rango' ? 'bg-white shadow-sm' : 'text-neutral-500'}"
                on:click={verRango}>Reporte del periodo</button>
    </div>

    <AlertaAusencias />

    {#if error}
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
    {/if}

    {#if vista === 'dia'}
        <div class="flex flex-wrap items-end gap-3 rounded-lg bg-neutral-50 border p-3 mb-4">
            <div>
                <p class="text-[11px] font-semibold uppercase text-neutral-500 mb-1">Dia</p>
                <input type="date" bind:value={fechaDia} on:change={cargarDia}
                       class="border rounded-md px-3 py-1.5 text-sm" />
            </div>
            {#if dia}
                <p class="text-xs text-neutral-500 pb-2">
                    {dia.en_curso
                        ? `Dia en curso · las faltas se confirman cuando cierre (corte ${dia.hora_corte.slice(0, 5)})`
                        : 'Dia cerrado'}
                </p>
            {/if}
        </div>

        {#if dia}
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div class="rounded-lg bg-sky-50 p-3">
                    <p class="text-[11px] uppercase text-neutral-500">Personal</p>
                    <p class="text-2xl font-semibold">{dia.resumen.personal}</p>
                </div>
                <div class="rounded-lg bg-green-50 p-3">
                    <p class="text-[11px] uppercase text-neutral-500">Presentes</p>
                    <p class="text-2xl font-semibold">{dia.resumen.presentes}</p>
                </div>
                <div class="rounded-lg bg-amber-50 p-3">
                    <p class="text-[11px] uppercase text-neutral-500">Tardanzas</p>
                    <p class="text-2xl font-semibold">{dia.resumen.tardanzas}</p>
                </div>
                <div class="rounded-lg bg-red-50 p-3">
                    <p class="text-[11px] uppercase text-neutral-500">
                        {dia.en_curso ? 'No llegaron aun' : 'Faltas'}
                    </p>
                    <p class="text-2xl font-semibold">
                        {dia.en_curso ? dia.resumen.pendientes : dia.resumen.faltas}
                    </p>
                </div>
            </div>

            <div class="overflow-x-auto rounded-lg border">
                <table class="w-full text-sm">
                    <thead class="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                        <tr>
                            <th class="p-2">Colaborador</th><th class="p-2">Area</th>
                            <th class="p-2">Horario</th><th class="p-2">Entrada</th>
                            <th class="p-2">Salida</th><th class="p-2 text-right">Horas</th>
                            <th class="p-2">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each dia.filas as f}
                            <tr class="border-t hover:bg-neutral-50">
                                <td class="p-2">{f.nombres}</td>
                                <td class="p-2 text-neutral-500">{f.area || '-'}</td>
                                <td class="p-2 text-neutral-500">{f.hora_esperada ? f.hora_esperada.slice(0, 5) : '-'}</td>
                                <td class="p-2">
                                    {#if f.entrada}
                                        {f.entrada.hora}
                                        {#if f.entrada.tardanza_min > 0}
                                            <span class="block text-[11px] text-red-600">{f.entrada.tardanza_min} min tarde</span>
                                        {/if}
                                        {#if f.entrada.metodo === 'MANUAL'}
                                            <span class="block text-[11px] text-neutral-400">manual{f.entrada.motivo ? ': ' + f.entrada.motivo : ''}</span>
                                        {/if}
                                    {:else}-{/if}
                                </td>
                                <td class="p-2">{f.salida ? f.salida.hora : '-'}</td>
                                <td class="p-2 text-right tabular-nums">{f.horas !== null ? f.horas : '-'}</td>
                                <td class="p-2 {ESTADOS[f.estado]?.clase || ''}">{ESTADOS[f.estado]?.txt || f.estado}</td>
                            </tr>
                        {:else}
                            <tr><td colspan="7" class="p-6 text-center text-neutral-500">
                                Esta sede todavia no tiene personal cargado en el modulo de asistencia.
                            </td></tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}

    {:else}
        <div class="flex flex-wrap items-end gap-3 rounded-lg bg-neutral-50 border p-3 mb-4">
            <div>
                <p class="text-[11px] font-semibold uppercase text-neutral-500 mb-1">Desde</p>
                <input type="date" bind:value={desde} class="border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <div>
                <p class="text-[11px] font-semibold uppercase text-neutral-500 mb-1">Hasta</p>
                <input type="date" bind:value={hasta} class="border rounded-md px-3 py-1.5 text-sm" />
            </div>
            <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                    on:click={cargarRango}>Ver reporte</button>

            {#if reporte}
                <button class="rounded-md border border-green-600 px-4 py-1.5 text-sm font-medium text-green-700 hover:bg-green-50"
                        on:click={descargarCsv}>
                    <i class="fa-solid fa-file-excel"></i> Descargar Excel
                </button>
                <p class="pb-2 text-xs text-neutral-500">{reporte.dias} dia(s)</p>
            {/if}
        </div>

        {#if reporte}
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                <div class="rounded-lg bg-sky-50 p-3">
                    <p class="text-[11px] uppercase text-neutral-500">Asistencias</p>
                    <p class="text-2xl font-semibold">{reporte.totales.asistencias}</p>
                </div>
                <div class="rounded-lg bg-amber-50 p-3">
                    <p class="text-[11px] uppercase text-neutral-500">Tardanzas</p>
                    <p class="text-2xl font-semibold">{reporte.totales.tardanzas}</p>
                </div>
                <div class="rounded-lg bg-amber-50 p-3">
                    <p class="text-[11px] uppercase text-neutral-500">Minutos tarde</p>
                    <p class="text-2xl font-semibold">{reporte.totales.tardanza_min_total}</p>
                </div>
                <div class="rounded-lg bg-red-50 p-3">
                    <p class="text-[11px] uppercase text-neutral-500">Faltas</p>
                    <p class="text-2xl font-semibold">{reporte.totales.faltas}</p>
                </div>
                <div class="rounded-lg bg-green-50 p-3">
                    <p class="text-[11px] uppercase text-neutral-500">Horas trabajadas</p>
                    <p class="text-2xl font-semibold">{reporte.totales.horas_trabajadas}</p>
                </div>
            </div>

            <div class="overflow-x-auto rounded-lg border">
                <table class="w-full text-sm">
                    <thead class="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                        <tr>
                            <th class="p-2">Colaborador</th><th class="p-2">Area</th>
                            <th class="p-2 text-right">Dias</th><th class="p-2 text-right">Asistio</th>
                            <th class="p-2 text-right">Tardanzas</th><th class="p-2 text-right">Min. tarde</th>
                            <th class="p-2 text-right">Faltas</th><th class="p-2 text-right">Sin salida</th>
                            <th class="p-2 text-right">Horas</th><th class="p-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each reporte.filas as f}
                            <tr class="border-t hover:bg-neutral-50">
                                <td class="p-2">
                                    {f.nombres}
                                    {#if f.marcas_manuales > 0}
                                        <span class="block text-[11px] text-neutral-400">{f.marcas_manuales} marca(s) manual(es)</span>
                                    {/if}
                                </td>
                                <td class="p-2 text-neutral-500">{f.area || '-'}</td>
                                <td class="p-2 text-right tabular-nums">{f.dias_esperados}</td>
                                <td class="p-2 text-right tabular-nums">{f.asistencias}</td>
                                <td class="p-2 text-right tabular-nums {f.tardanzas ? 'text-amber-700 font-medium' : ''}">{f.tardanzas}</td>
                                <td class="p-2 text-right tabular-nums">{minutosATexto(f.tardanza_min_total)}</td>
                                <td class="p-2 text-right tabular-nums {f.faltas ? 'text-red-600 font-semibold' : ''}">{f.faltas}</td>
                                <td class="p-2 text-right tabular-nums">{f.dias_incompletos}</td>
                                <td class="p-2 text-right tabular-nums font-medium">{f.horas_trabajadas}</td>
                                <td class="p-2 text-right">
                                    {#if f.detalle.length}
                                        <button class="btn-link text-xs text-sky-600 hover:underline"
                                                on:click={() => (expandido = expandido === f.idcolaborador ? null : f.idcolaborador)}>
                                            {expandido === f.idcolaborador ? 'Ocultar' : 'Ver dias'}
                                        </button>
                                    {/if}
                                </td>
                            </tr>

                            {#if expandido === f.idcolaborador}
                                <tr class="bg-neutral-50 border-t">
                                    <td colspan="10" class="p-3">
                                        <table class="w-full text-xs">
                                            <thead class="text-left text-neutral-500">
                                                <tr>
                                                    <th class="pb-1">Fecha</th><th class="pb-1">Entrada</th>
                                                    <th class="pb-1">Salida</th><th class="pb-1 text-right">Tarde</th>
                                                    <th class="pb-1 text-right">Horas</th><th class="pb-1"></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {#each f.detalle as d}
                                                    <tr>
                                                        <td class="py-0.5">{d.fecha}</td>
                                                        <td class="py-0.5">{d.entrada || '-'}</td>
                                                        <td class="py-0.5">{d.salida || '-'}</td>
                                                        <td class="py-0.5 text-right {d.tardanza_min > 0 ? 'text-red-600' : ''}">
                                                            {d.tardanza_min > 0 ? d.tardanza_min + ' min' : '-'}
                                                        </td>
                                                        <td class="py-0.5 text-right tabular-nums">{d.horas !== null ? d.horas : '-'}</td>
                                                        <td class="py-0.5 text-neutral-400">{d.manual ? 'manual' : ''}</td>
                                                    </tr>
                                                {/each}
                                            </tbody>
                                        </table>
                                    </td>
                                </tr>
                            {/if}
                        {:else}
                            <tr><td colspan="10" class="p-6 text-center text-neutral-500">Sin datos en ese rango.</td></tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <p class="mt-3 text-xs text-neutral-500">
                <strong>Dias sin salida</strong> son jornadas con entrada pero sin salida marcada: no suman horas,
                porque inventar una hora de salida seria pagar o descontar sobre un dato que nadie registro.
            </p>
        {/if}
    {/if}
</div>
