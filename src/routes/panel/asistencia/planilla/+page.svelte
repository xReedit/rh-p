<script lang="ts">
    // De las marcas a la boleta.
    //
    // Dos pasos a proposito: primero se ve el calculo con el detalle de como
    // salio cada importe, y recien despues se manda a las boletas. Un numero
    // que aparece solo en la boleta y nadie puede explicar es un reclamo
    // asegurado, y quien lo tiene que explicar es el que atiende al trabajador.
    //
    // Aplicar es re-ejecutable: reemplaza lo que este mismo calculo puso antes
    // para el periodo, y no toca los adelantos ni bonos cargados a mano.

    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { getData, postDataJSON } from '$root/services/httpClient.services';
    import Preload from '$root/components/Preload.svelte';
    import AlertaAusencias from '$root/components/AlertaAusencias.svelte';

    let isPreloadShow = true;
    let error = '';
    let aviso = '';

    let modo: 'periodo' | 'rango' = 'periodo';
    let periodo = '';           // la clave: el primer dia del periodo
    let desde = '';
    let hasta = '';
    // Los periodos los arma la API a partir de la frecuencia de la empresa: si
    // los calculara la pantalla, dos lugares tendrian que ponerse de acuerdo
    // sobre cuando empieza una semana.
    let periodos: any[] = [];
    let frecuencia = 'MENSUAL';

    let calculo: any = null;
    let expandido: number | null = null;
    let confirmando = false;
    let aplicando = false;
    let nAusencias = 0;

    onMount(async () => {
        await isLogin();
        const hoy = new Date().toISOString().slice(0, 10);
        hasta = hoy;
        desde = hoy.slice(0, 8) + '01';

        try {
            const r = await getData('asistencia-rrhh', 'planilla/configuracion');
            if (r?.success) {
                periodos = r.datos.periodos;
                frecuencia = r.datos.frecuencia_pago;
                // El que corresponde cerrar ahora es el primero de la lista
                periodo = periodos.length ? periodos[0].clave : '';
            }
        } catch (e) {
            error = 'No se pudo leer la configuracion de planilla.';
        }
        isPreloadShow = false;
    });

    const cuerpo = () => (modo === 'periodo' ? { periodo } : { desde, hasta });

    const soles = (n: number) =>
        n === null || n === undefined ? '-' : n.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    async function calcular() {
        error = '';
        aviso = '';
        calculo = null;
        isPreloadShow = true;
        try {
            const r = await postDataJSON('asistencia-rrhh', 'planilla/calcular', cuerpo());
            if (!r?.success) { throw new Error(r?.error || 'No se pudo calcular'); }
            calculo = r.datos;
        } catch (e: any) {
            error = e.message;
        }
        isPreloadShow = false;
    }

    async function aplicar() {
        aplicando = true;
        error = '';
        try {
            const r = await postDataJSON('asistencia-rrhh', 'planilla/aplicar', cuerpo());
            if (!r?.success) { throw new Error(r?.error || 'No se pudo aplicar'); }
            calculo = r.datos;
            confirmando = false;
            aviso = r.datos.aplicados === 0
                ? 'No habia nada que llevar a las boletas en este periodo.'
                : `${r.datos.aplicados} linea(s) en las boletas del periodo.` +
                  (r.datos.reemplazados ? ` Se reemplazaron ${r.datos.reemplazados} de un calculo anterior.` : '');
        } catch (e: any) {
            error = e.message;
        }
        aplicando = false;
    }

    /** Solo las filas con algo que mostrar: el resto es ruido en una lista larga. */
    $: conMovimiento = calculo ? calculo.filas.filter((f: any) => f.conceptos.length) : [];
    $: sinContrato = calculo ? calculo.filas.filter((f: any) => f.sin_contrato) : [];
    // Se arma aca y no en el marcado: las anotaciones de TS no se compilan
    // dentro de una expresion de plantilla y el parser de Svelte se atraganta.
    $: sinContratoNombres = sinContrato.map((f: any) => f.nombres).join(', ');
</script>

<div in:fade class="max-w-6xl m-auto p-4">
    <Preload isLoading={isPreloadShow} />

    <div class="flex items-center justify-between pb-3">
        <div>
            <p class="text-xl font-bold">Asistencia en la boleta</p>
            <p class="text-xs text-neutral-600">
                Recargos por descanso y feriado trabajados, descuentos por tardanza y por dias no trabajados.
            </p>
        </div>
        <button class="btn-link text-sm text-neutral-600 hover:text-black" on:click={() => goto('../asistencia')}>
            <i class="fa-solid fa-arrow-left"></i> Volver
        </button>
    </div>

    <AlertaAusencias bind:cantidad={nAusencias}
        contexto="Resolvelo ANTES de llevar esto a las boletas: si estan de vacaciones y no lo registraste, se les va a descontar el periodo completo." />

    {#if error}
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
    {/if}
    {#if aviso}
        <div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{aviso}</div>
    {/if}

    <div class="mb-4 flex flex-wrap items-end gap-3 rounded-lg border bg-neutral-50 p-3">
        <div class="inline-flex rounded-lg bg-neutral-100 p-1">
            <button class="rounded-md px-3 py-1 text-sm font-medium {modo === 'periodo' ? 'bg-white shadow-sm' : 'text-neutral-500'}"
                    on:click={() => (modo = 'periodo')}>Periodo de pago</button>
            <button class="rounded-md px-3 py-1 text-sm font-medium {modo === 'rango' ? 'bg-white shadow-sm' : 'text-neutral-500'}"
                    on:click={() => (modo = 'rango')}>Otras fechas</button>
        </div>

        {#if modo === 'periodo'}
            <div>
                <p class="mb-1 text-[11px] font-semibold uppercase text-neutral-500">
                    Periodo ({frecuencia.toLowerCase()})
                </p>
                <select bind:value={periodo} class="rounded-md border px-3 py-1.5 text-sm">
                    {#each periodos as p, i}
                        <option value={p.clave}>{p.etiqueta}{i === 0 ? ' (en curso)' : ''}</option>
                    {/each}
                </select>
            </div>
            <a class="pb-2 text-xs text-sky-600 hover:underline" href="/panel/planilla/configuracion">
                Cambiar frecuencia
            </a>
        {:else}
            <div>
                <p class="mb-1 text-[11px] font-semibold uppercase text-neutral-500">Desde</p>
                <input type="date" bind:value={desde} class="rounded-md border px-3 py-1.5 text-sm" />
            </div>
            <div>
                <p class="mb-1 text-[11px] font-semibold uppercase text-neutral-500">Hasta</p>
                <input type="date" bind:value={hasta} class="rounded-md border px-3 py-1.5 text-sm" />
            </div>
        {/if}

        <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                on:click={calcular}>Calcular</button>

        {#if calculo}
            <span class="flex-1"></span>
            <button class="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                    disabled={!conMovimiento.length} on:click={() => (confirmando = true)}>
                Llevar a las boletas
            </button>
        {/if}
    </div>

    {#if calculo}
        {#if calculo.en_curso}
            <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                El periodo todavia no termina. Los numeros pueden cambiar: las faltas de los dias que aun no cierran no se cuentan.
            </div>
        {/if}

        {#if sinContrato.length}
            <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                {sinContrato.length} persona(s) sin contrato activo: no se les puede calcular nada hasta que tengan sueldo cargado
                ({sinContratoNombres}).
            </div>
        {/if}

        <div class="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div class="rounded-lg bg-neutral-50 p-3">
                <p class="text-[11px] uppercase text-neutral-500">Personal</p>
                <p class="text-2xl font-semibold">{calculo.totales.personal}</p>
            </div>
            <div class="rounded-lg bg-green-50 p-3">
                <p class="text-[11px] uppercase text-neutral-500">A sumar</p>
                <p class="text-2xl font-semibold tabular-nums">{soles(calculo.totales.ingresos)}</p>
            </div>
            <div class="rounded-lg bg-red-50 p-3">
                <p class="text-[11px] uppercase text-neutral-500">A descontar</p>
                <p class="text-2xl font-semibold tabular-nums">{soles(calculo.totales.descuentos)}</p>
            </div>
            <div class="rounded-lg bg-sky-50 p-3">
                <p class="text-[11px] uppercase text-neutral-500">Boletas afectadas</p>
                <p class="text-2xl font-semibold">{conMovimiento.length}</p>
            </div>
        </div>

        <div class="overflow-x-auto rounded-lg border">
            <table class="w-full text-sm">
                <thead class="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                    <tr>
                        <th class="p-2">Colaborador</th>
                        <th class="p-2 text-right">Dias</th>
                        <th class="p-2 text-right">Faltas</th>
                        <th class="p-2 text-right">Tardanza</th>
                        <th class="p-2 text-right">Descanso</th>
                        <th class="p-2 text-right">Feriado</th>
                        <th class="p-2 text-right">Suma</th>
                        <th class="p-2 text-right">Descuenta</th>
                    </tr>
                </thead>
                <tbody>
                    {#each calculo.filas as f (f.idcolaborador)}
                        <tr class="cursor-pointer border-t hover:bg-neutral-50"
                            on:click={() => (expandido = expandido === f.idcolaborador ? null : f.idcolaborador)}>
                            <td class="p-2">
                                {f.nombres}
                                {#if f.sin_contrato}
                                    <span class="block text-[11px] text-amber-700">sin contrato activo</span>
                                {:else}
                                    <span class="block text-[11px] text-neutral-400">
                                        {soles(f.sueldo)} {f.unidad?.toLowerCase()} · dia {soles(f.valor_dia)}
                                    </span>
                                {/if}
                            </td>
                            <td class="p-2 text-right tabular-nums">{f.dias_trabajados}</td>
                            <td class="p-2 text-right tabular-nums {f.faltas ? 'text-red-600' : 'text-neutral-400'}">{f.faltas}</td>
                            <td class="p-2 text-right tabular-nums {f.tardanza_min ? 'text-red-600' : 'text-neutral-400'}">
                                {f.tardanza_min ? f.tardanza_min + ' min' : '-'}
                            </td>
                            <td class="p-2 text-right tabular-nums text-neutral-500">{f.descansos_trabajados || '-'}</td>
                            <td class="p-2 text-right tabular-nums text-neutral-500">{f.feriados_trabajados || '-'}</td>
                            <td class="p-2 text-right tabular-nums {f.total_ingresos ? 'font-semibold text-green-700' : 'text-neutral-400'}">
                                {f.total_ingresos ? soles(f.total_ingresos) : '-'}
                            </td>
                            <td class="p-2 text-right tabular-nums {f.total_descuentos ? 'font-semibold text-red-700' : 'text-neutral-400'}">
                                {f.total_descuentos ? soles(f.total_descuentos) : '-'}
                            </td>
                        </tr>
                        {#if expandido === f.idcolaborador}
                            <tr class="border-t bg-neutral-50">
                                <td colspan="8" class="p-3">
                                    {#each f.conceptos as c}
                                        <div class="flex items-start gap-3 border-b py-1.5 text-sm last:border-0">
                                            <span class="w-20 shrink-0 text-[11px] font-semibold uppercase
                                                         {c.tipo === 'INGRESO' ? 'text-green-700' : 'text-red-700'}">
                                                {c.tipo === 'INGRESO' ? 'Suma' : 'Descuenta'}
                                            </span>
                                            <span class="flex-1">
                                                {c.descripcion}
                                                <span class="block text-[11px] text-neutral-500">{c.detalle}</span>
                                            </span>
                                            <span class="tabular-nums font-semibold">{soles(c.importe)}</span>
                                        </div>
                                    {:else}
                                        <p class="text-xs text-neutral-500">
                                            Nada que sumar ni descontar en este periodo.
                                        </p>
                                    {/each}
                                </td>
                            </tr>
                        {/if}
                    {:else}
                        <tr><td colspan="8" class="p-6 text-center text-neutral-500">
                            Esta sede no tiene personal cargado en asistencia.
                        </td></tr>
                    {/each}
                </tbody>
            </table>
        </div>
        <p class="mt-2 text-[11px] text-neutral-500">
            Toca una fila para ver de donde sale cada importe. Los descuentos son proporcionales al tiempo no trabajado:
            la ley no permite multar por tardanza.
        </p>
    {/if}
</div>

{#if confirmando}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" transition:fade={{ duration: 120 }}>
        <div class="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div class="border-b p-4">
                <p class="font-semibold">Llevar a las boletas del periodo {calculo.periodo}</p>
            </div>
            <div class="p-4 text-sm">
                <p>Se van a escribir los conceptos en {conMovimiento.length} boleta(s):</p>
                <div class="mt-3 flex gap-6">
                    <div>
                        <p class="text-[11px] uppercase text-neutral-500">A sumar</p>
                        <p class="text-lg font-semibold tabular-nums text-green-700">{soles(calculo.totales.ingresos)}</p>
                    </div>
                    <div>
                        <p class="text-[11px] uppercase text-neutral-500">A descontar</p>
                        <p class="text-lg font-semibold tabular-nums text-red-700">{soles(calculo.totales.descuentos)}</p>
                    </div>
                </div>
                {#if nAusencias}
                    <p class="mt-4 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                        Hay {nAusencias} persona(s) sin marcar que todavia no resolviste.
                        Si alguna estaba de vacaciones, se le va a descontar igual.
                    </p>
                {/if}
                <p class="mt-4 text-xs text-neutral-500">
                    Si ya habias calculado este periodo, las lineas anteriores se reemplazan.
                    Los adelantos y bonos que cargaste a mano no se tocan.
                </p>
            </div>
            <div class="flex justify-end gap-2 border-t p-4">
                <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                        on:click={() => (confirmando = false)}>Cancelar</button>
                <button class="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        disabled={aplicando} on:click={aplicar}>
                    {aplicando ? 'Aplicando...' : 'Confirmar'}
                </button>
            </div>
        </div>
    </div>
{/if}
