<script lang="ts">
    // Cuanto cuesta el personal.
    //
    // QUE MUESTRA Y QUE NO
    // El COSTO, no las ventas. Comparar costo contra venta es una pregunta de
    // negocio y vive en el dashboard, que es donde el dueno mira los
    // indicadores para decidir. Aqui vive la pregunta de Recursos Humanos:
    // cuanto cuesta, quien cuesta, y de donde sale ese numero.
    //
    // POR QUE NO ES LO MISMO QUE LA PLANILLA
    // La planilla dice lo que va a COBRAR cada uno. El costo dice lo que SALE
    // del negocio, que es mas: el aporte a EsSalud lo paga la empresa y no se
    // le descuenta a nadie, pero es plata que se va igual.
    //
    // El calculo lo hace el mismo motor que la boleta. Si alguna vez estos
    // numeros no cuadran con la planilla, es un error -- no dos criterios.

    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { getData, postDataJSON } from '$root/services/httpClient.services';
    import Preload from '$root/components/Preload.svelte';

    let isPreloadShow = true;
    let error = '';

    let periodo = '';
    let periodos: any[] = [];
    let costo: any = null;
    let calculando = false;

    onMount(async () => {
        if (!isLogin()) { goto('/'); return; }
        await cargarPeriodos();
        isPreloadShow = false;
        if (periodo) { await calcular(); }
    });

    async function cargarPeriodos() {
        try {
            const r = await getData('asistencia-rrhh', 'planilla/configuracion');
            if (!r?.success) { throw new Error(r?.error || 'No se pudo cargar'); }
            periodos = r.datos.periodos || [];
            periodo = periodos.length ? periodos[0].clave : '';
        } catch (e: any) {
            error = e.message;
        }
    }

    async function calcular() {
        if (!periodo) { return; }
        calculando = true;
        error = '';
        try {
            const r = await postDataJSON('asistencia-rrhh', 'planilla/costo', { periodo });
            if (!r?.success) { throw new Error(r?.error || 'No se pudo calcular'); }
            costo = r.datos;
        } catch (e: any) {
            error = e.message;
            costo = null;
        }
        calculando = false;
    }

    const soles = (n: number) =>
        'S/ ' + Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    /** Cuanto pesa un area sobre el total, para la barra. */
    const pct = (parte: number, total: number) =>
        total > 0 ? Math.round((parte / total) * 100) : 0;
</script>

<svelte:head><title>Costo de personal</title></svelte:head>

<div in:fade class="p-5">
    <Preload isLoading={isPreloadShow} />

    <div class="mb-4 flex items-start justify-between">
        <div>
            <h1 class="text-xl font-bold">Costo de personal</h1>
            <p class="text-xs text-neutral-600">
                Lo que le sale al negocio: sueldos, recargos y aportes, menos los descuentos.
            </p>
        </div>
        <a class="btn-link text-sm text-neutral-600 hover:underline" href="/panel">&larr; Volver</a>
    </div>

    {#if error}
        <div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
    {/if}

    <div class="mb-4 flex flex-wrap items-end gap-3 rounded-lg border p-3">
        <div>
            <label class="mb-1 block text-[11px] font-semibold uppercase text-neutral-500" for="per">Periodo</label>
            <select id="per" bind:value={periodo} class="rounded-md border px-2 py-1.5 text-sm">
                {#each periodos as p}
                    <option value={p.clave}>{p.etiqueta}{p.en_curso ? ' (en curso)' : ''}</option>
                {/each}
            </select>
        </div>
        <button class="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                disabled={calculando || !periodo} on:click={calcular}>
            {calculando ? 'Calculando...' : 'Ver costo'}
        </button>
    </div>

    {#if costo}
        {#if costo.en_curso}
            <p class="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                Este periodo todavia no termina: los numeros se siguen moviendo hasta que cierre.
            </p>
        {/if}

        {#if costo.totales.sin_contrato > 0}
            <p class="mb-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                <b>{costo.totales.sin_contrato} persona(s) sin contrato cargado</b> no suman al costo.
                El total de abajo es menor que el real hasta que se les cargue el contrato.
            </p>
        {/if}

        <!-- El numero grande primero, y debajo de que esta hecho: un total que
             no se puede descomponer no se puede discutir con el contador. -->
        <div class="mb-4 rounded-lg border bg-neutral-50 p-4">
            <p class="text-[11px] uppercase tracking-wide text-neutral-500">Costo total del periodo</p>
            <p class="text-3xl font-semibold">{soles(costo.totales.costo)}</p>
            <p class="mt-1 text-xs text-neutral-600">
                {costo.periodo} &middot; {costo.totales.personal} persona(s)
            </p>

            <div class="mt-3 grid grid-cols-2 gap-3 border-t pt-3 text-sm md:grid-cols-4">
                <div>
                    <p class="text-[11px] uppercase text-neutral-500">Sueldos</p>
                    <p class="font-medium tabular-nums">{soles(costo.totales.sueldos)}</p>
                </div>
                <div>
                    <p class="text-[11px] uppercase text-neutral-500">Recargos</p>
                    <p class="font-medium tabular-nums text-sky-700">+{soles(costo.totales.recargos)}</p>
                </div>
                <div>
                    <p class="text-[11px] uppercase text-neutral-500">Descuentos</p>
                    <p class="font-medium tabular-nums text-red-600">-{soles(costo.totales.descuentos)}</p>
                </div>
                <div>
                    <p class="text-[11px] uppercase text-neutral-500">
                        Aportes {#if costo.pct_aportes}({costo.pct_aportes}%){/if}
                    </p>
                    <p class="font-medium tabular-nums">
                        {costo.pct_aportes ? '+' + soles(costo.totales.aportes) : '-'}
                    </p>
                </div>
            </div>

            {#if !costo.pct_aportes}
                <p class="mt-2 text-[11px] text-neutral-500">
                    Sin aporte a EsSalud activado: el costo es solo lo que cobran.
                    Se enciende en <a class="underline" href="/panel/planilla/configuracion">configuracion de planilla</a>.
                </p>
            {/if}
        </div>

        <!-- Por area: es sobre esto que se decide, no sobre el total -->
        {#if costo.por_area.length > 1}
            <div class="mb-4 rounded-lg border p-4">
                <p class="mb-2 text-sm font-semibold">En que se va</p>
                {#each costo.por_area as a}
                    <div class="mb-2 last:mb-0">
                        <div class="flex items-baseline justify-between text-sm">
                            <span>{a.area} <span class="text-xs text-neutral-500">({a.personas})</span></span>
                            <span class="tabular-nums font-medium">
                                {soles(a.costo)}
                                <span class="ml-1 text-xs text-neutral-500">{pct(a.costo, costo.totales.costo)}%</span>
                            </span>
                        </div>
                        <div class="mt-1 h-1.5 w-full rounded-full bg-neutral-100">
                            <div class="h-1.5 rounded-full bg-sky-500"
                                 style="width: {pct(a.costo, costo.totales.costo)}%"></div>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <div class="overflow-x-auto rounded-lg border">
            <table class="w-full text-sm">
                <thead class="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                    <tr>
                        <th class="p-2">Colaborador</th>
                        <th class="p-2">Area</th>
                        <th class="p-2 text-right">Sueldo</th>
                        <th class="p-2 text-right">Recargos</th>
                        <th class="p-2 text-right">Descuentos</th>
                        <th class="p-2 text-right">Cobra</th>
                        <th class="p-2 text-right">Aportes</th>
                        <th class="p-2 text-right">Cuesta</th>
                    </tr>
                </thead>
                <tbody>
                    {#each costo.personas as p}
                        <tr class="border-t hover:bg-neutral-50">
                            <td class="p-2">
                                {p.nombres}
                                {#if p.sin_contrato}
                                    <span class="block text-[11px] text-amber-700">sin contrato cargado</span>
                                {/if}
                            </td>
                            <td class="p-2 text-neutral-500">{p.area || '-'}</td>
                            <td class="p-2 text-right tabular-nums">{soles(p.sueldo_periodo)}</td>
                            <td class="p-2 text-right tabular-nums {p.recargos ? 'text-sky-700' : 'text-neutral-300'}">
                                {p.recargos ? '+' + soles(p.recargos) : '-'}
                            </td>
                            <td class="p-2 text-right tabular-nums {p.descuentos ? 'text-red-600' : 'text-neutral-300'}">
                                {p.descuentos ? '-' + soles(p.descuentos) : '-'}
                            </td>
                            <td class="p-2 text-right tabular-nums">{soles(p.remuneracion)}</td>
                            <td class="p-2 text-right tabular-nums {p.aportes ? '' : 'text-neutral-300'}">
                                {p.aportes ? soles(p.aportes) : '-'}
                            </td>
                            <td class="p-2 text-right tabular-nums font-semibold">{soles(p.costo)}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <p class="mt-3 text-xs text-neutral-500">
            <b>Cobra</b> es lo que recibe la persona. <b>Cuesta</b> le suma lo que ademas paga la
            empresa por ella. Es la misma cuenta de la boleta: si algo no cuadra con la planilla,
            avisanos, porque deberia.
        </p>
    {/if}
</div>
