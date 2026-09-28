<script lang="ts">
    // Quien no esta marcando, y por que.
    //
    // Desde que los dias no trabajados se descuentan solos de la boleta, no
    // saber el motivo cuesta plata: al que esta de vacaciones se le descontaria
    // el mes, y el que renuncio y nadie dio de baja acumularia faltas para
    // siempre. Esta pantalla existe para que eso se resuelva ANTES de cerrar la
    // planilla, no despues del reclamo.

    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { getData, postDataJSON } from '$root/services/httpClient.services';
    import Preload from '$root/components/Preload.svelte';
    const CATEGORIAS = [
        { v: 'VACACIONES', t: 'Vacaciones', paga: true },
        { v: 'DESCANSO_MEDICO', t: 'Descanso medico', paga: true },
        { v: 'LICENCIA', t: 'Licencia con goce', paga: true },
        { v: 'PERMISO_SIN_GOCE', t: 'Permiso sin goce de haber', paga: false }
    ];

    let isPreloadShow = true;
    let error = '';
    let aviso = '';
    let alertas: any[] = [];

    // --- resolver ---
    let sel: any = null;
    let que: 'JUSTIFICADA' | 'BAJA' | '' = '';
    let categoria = 'VACACIONES';
    let desde = '';
    let hasta = '';
    let fbaja = '';
    let mbaja = '';
    let guardando = false;

    onMount(async () => {
        await isLogin();
        await cargar();
        isPreloadShow = false;
    });

    async function cargar() {
        error = '';
        isPreloadShow = true;
        try {
            const r = await getData('asistencia-rrhh', 'ausencias/alertas');
            if (!r?.success) { throw new Error(r?.error || 'No se pudo consultar'); }
            alertas = r.datos.alertas;
        } catch (e: any) {
            error = e.message;
        }
        isPreloadShow = false;
    }

    function abrir(a: any) {
        sel = a;
        que = '';
        categoria = 'VACACIONES';
        // Se propone el rango que el sistema detecto: es lo que casi siempre es,
        // y tipear dos fechas cada vez invita a dejarlo para despues.
        desde = a.desde;
        hasta = a.hasta;
        fbaja = a.desde;
        mbaja = '';
        aviso = '';
    }

    $: cat = CATEGORIAS.find(c => c.v === categoria);

    async function guardar() {
        if (que === 'BAJA' && !mbaja.trim()) { error = 'Escribe por que deja de trabajar.'; return; }
        if (que === 'JUSTIFICADA' && (!desde || !hasta)) { error = 'Pon desde y hasta que dia.'; return; }

        guardando = true;
        error = '';
        try {
            const r = que === 'JUSTIFICADA'
                ? await postDataJSON('asistencia-rrhh', 'ausencias/registrar', {
                    idcolaborador: sel.idcolaborador, desde, hasta, categoria
                })
                : await postDataJSON('asistencia-rrhh', 'ausencias/baja', {
                    idcolaborador: sel.idcolaborador, fecha: fbaja, motivo: mbaja.trim()
                });
            if (!r?.success) { throw new Error(r?.error || 'No se pudo guardar'); }

            aviso = que === 'BAJA'
                ? `${sel.nombres} quedo dado de baja. Deja de aparecer en el dia y en la planilla.`
                : `${r.datos.dias} dia(s) registrados para ${sel.nombres}.` +
                  (r.datos.pagado ? ' Se pagan normal.' : ' NO se pagan: se descuentan.');
            sel = null;
            await cargar();
        } catch (e: any) {
            error = e.message;
        }
        guardando = false;
    }
</script>

<div in:fade class="max-w-4xl m-auto p-4">
    <Preload isLoading={isPreloadShow} />

    <div class="flex items-center justify-between pb-3">
        <div>
            <p class="text-xl font-bold">Quien no esta marcando</p>
            <p class="text-xs text-neutral-600">
                Vacaciones, permisos o gente que ya no trabaja. Hay que resolverlo antes de cerrar la planilla.
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

    {#each alertas as a (a.idcolaborador)}
        <div class="mb-2 flex flex-wrap items-center gap-4 rounded-lg border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 p-4">
            <div class="flex-1 min-w-[180px]">
                <p class="font-semibold">{a.nombres}</p>
                <p class="text-[11px] text-amber-800">{a.dni || ''}</p>
            </div>
            <div class="text-center">
                <p class="text-lg font-semibold text-amber-800">{a.dias}</p>
                <p class="text-[10px] uppercase text-amber-700">dias sin marcar</p>
            </div>
            <div class="text-center">
                <p class="text-sm font-semibold text-amber-800">{a.ultima_marca || 'nunca'}</p>
                <p class="text-[10px] uppercase text-amber-700">ultima marca</p>
            </div>
            <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
                    on:click={() => abrir(a)}>Resolver</button>
        </div>
    {:else}
        <div class="rounded-lg border bg-neutral-50 p-8 text-center text-sm text-neutral-500">
            Todo el personal esta marcando con normalidad.
        </div>
    {/each}
</div>

{#if sel}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" transition:fade={{ duration: 120 }}>
        <div class="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div class="border-b p-4">
                <p class="font-semibold">{sel.nombres}</p>
                <p class="text-xs text-neutral-500">
                    Lleva {sel.dias} dia(s) sin marcar, desde el {sel.desde}.
                </p>
            </div>

            <div class="max-h-[60vh] overflow-y-auto p-4">
                <label class="flex items-center gap-2 py-1 text-sm">
                    <input type="radio" bind:group={que} value="JUSTIFICADA" /> Esta de vacaciones o con permiso
                </label>
                <label class="flex items-center gap-2 py-1 text-sm">
                    <input type="radio" bind:group={que} value="BAJA" /> Ya no trabaja aca
                </label>

                {#if que === 'JUSTIFICADA'}
                    <div class="mt-3 space-y-3 border-t pt-3">
                        <div>
                            <p class="mb-1 text-[11px] font-semibold uppercase text-neutral-500">Motivo</p>
                            <select bind:value={categoria} class="w-full rounded-md border px-3 py-1.5 text-sm">
                                {#each CATEGORIAS as c}
                                    <option value={c.v}>{c.t}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="flex gap-3">
                            <div class="flex-1">
                                <p class="mb-1 text-[11px] font-semibold uppercase text-neutral-500">Desde</p>
                                <input type="date" bind:value={desde} class="w-full rounded-md border px-3 py-1.5 text-sm" />
                            </div>
                            <div class="flex-1">
                                <p class="mb-1 text-[11px] font-semibold uppercase text-neutral-500">Hasta</p>
                                <input type="date" bind:value={hasta} class="w-full rounded-md border px-3 py-1.5 text-sm" />
                            </div>
                        </div>
                        <p class="text-xs {cat?.paga ? 'text-neutral-500' : 'text-red-700'}">
                            {cat?.paga
                                ? 'Estos dias se pagan normal: no se le descuenta nada por ellos.'
                                : 'Estos dias NO se pagan: se descuentan igual que una falta.'}
                        </p>
                    </div>
                {/if}

                {#if que === 'BAJA'}
                    <div class="mt-3 space-y-3 border-t pt-3">
                        <div>
                            <p class="mb-1 text-[11px] font-semibold uppercase text-neutral-500">Ultimo dia</p>
                            <input type="date" bind:value={fbaja} class="rounded-md border px-3 py-1.5 text-sm" />
                        </div>
                        <div>
                            <p class="mb-1 text-[11px] font-semibold uppercase text-neutral-500">Motivo</p>
                            <input type="text" bind:value={mbaja} maxlength="150"
                                   placeholder="Renuncia, fin de contrato, despido..."
                                   class="w-full rounded-md border px-3 py-1.5 text-sm" />
                        </div>
                        <p class="text-xs text-neutral-500">
                            No se borra nada: sus marcas y boletas quedan guardadas (la ley pide conservarlas 5 anos).
                            Deja de aparecer en el dia y en la planilla, y su celular se desactiva.
                        </p>
                    </div>
                {/if}
            </div>

            <div class="flex justify-end gap-2 border-t p-4">
                <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                        on:click={() => (sel = null)}>Cerrar</button>
                <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                        disabled={!que || guardando} on:click={guardar}>
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </div>
    </div>
{/if}
