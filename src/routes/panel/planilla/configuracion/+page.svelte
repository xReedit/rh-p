<script lang="ts">
    // Como lleva la planilla esta empresa.
    //
    // Dos decisiones que se contestan una vez: cada cuanto se paga y que tan
    // formal es la planilla. Los interruptores nacen apagados a proposito: el
    // nivel 0 -- "se cuanto le pago a cada uno y le imprimo su boleta" -- es lo
    // que la mayoria necesita, y empezar simple y agregar es mas facil que
    // empezar lleno y podar.

    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { getData, postDataJSON } from '$root/services/httpClient.services';
    import Preload from '$root/components/Preload.svelte';

    const FRECUENCIAS = [
        { v: 'DIARIO', t: 'Diario', d: 'Se cierra y se paga cada dia.' },
        { v: 'SEMANAL', t: 'Semanal', d: 'Lo mas comun en restaurantes: se paga una vez por semana.' },
        { v: 'QUINCENAL', t: 'Quincenal', d: 'Del 1 al 15 y del 16 al fin de mes.' },
        { v: 'MENSUAL', t: 'Mensual', d: 'Un solo cierre por mes.' }
    ];
    const DIAS = [
        { v: 1, t: 'Lunes' }, { v: 2, t: 'Martes' }, { v: 3, t: 'Miercoles' },
        { v: 4, t: 'Jueves' }, { v: 5, t: 'Viernes' }, { v: 6, t: 'Sabado' }, { v: 7, t: 'Domingo' }
    ];

    let isPreloadShow = true;
    let error = '';
    let aviso = '';
    let cfg: any = null;
    let guardando = false;

    onMount(async () => {
        await isLogin();
        await cargar();
        isPreloadShow = false;
    });

    async function cargar() {
        error = '';
        try {
            const r = await getData('asistencia-rrhh', 'planilla/configuracion');
            if (!r?.success) { throw new Error(r?.error || 'No se pudo cargar'); }
            cfg = r.datos;
        } catch (e: any) {
            error = e.message;
        }
    }

    async function guardar() {
        guardando = true;
        error = '';
        try {
            const cuerpo: any = {
                frecuencia_pago: cfg.frecuencia_pago,
                semana_empieza: cfg.semana_empieza
            };
            for (const i of cfg.interruptores) { cuerpo[i.campo] = i.activo; }

            const r = await postDataJSON('asistencia-rrhh', 'planilla/configuracion', cuerpo);
            if (!r?.success) { throw new Error(r?.error || 'No se pudo guardar'); }
            cfg = r.datos;
            aviso = 'Configuracion guardada.';
        } catch (e: any) {
            error = e.message;
        }
        guardando = false;
    }

    $: activos = cfg ? cfg.interruptores.filter((i: any) => i.activo).length : 0;
</script>

<div in:fade class="max-w-3xl m-auto p-4">
    <Preload isLoading={isPreloadShow} />

    <div class="flex items-center justify-between pb-3">
        <div>
            <p class="text-xl font-bold">Configuracion de planilla</p>
            <p class="text-xs text-neutral-600">Cada cuanto se paga y que conceptos entran a la boleta.</p>
        </div>
        <button class="btn-link text-sm text-neutral-600 hover:text-black" on:click={() => goto('/panel/planilla/list')}>
            <i class="fa-solid fa-arrow-left"></i> Volver
        </button>
    </div>

    {#if error}
        <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
    {/if}
    {#if aviso}
        <div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{aviso}</div>
    {/if}

    {#if cfg}
        <!-- 1 -->
        <div class="mb-5 rounded-lg border p-4">
            <p class="mb-1 text-sm font-semibold">1. Cada cuanto se paga</p>
            <p class="mb-3 text-xs text-neutral-500">
                Define los periodos que se pueden cerrar. Cambiarlo no altera lo que ya se pago.
            </p>

            <div class="grid gap-2 sm:grid-cols-2">
                {#each FRECUENCIAS as f}
                    <label class="flex cursor-pointer items-start gap-2 rounded-md border p-3 text-sm
                                  {cfg.frecuencia_pago === f.v ? 'border-sky-400 bg-sky-50' : 'hover:bg-neutral-50'}">
                        <input type="radio" bind:group={cfg.frecuencia_pago} value={f.v} class="mt-0.5" />
                        <span>
                            <b class="font-medium">{f.t}</b>
                            <span class="block text-xs text-neutral-500">{f.d}</span>
                        </span>
                    </label>
                {/each}
            </div>

            {#if cfg.frecuencia_pago === 'SEMANAL'}
                <div class="mt-3 flex flex-wrap items-center gap-2">
                    <span class="text-sm">La semana empieza el</span>
                    <select bind:value={cfg.semana_empieza} class="rounded-md border px-3 py-1.5 text-sm">
                        {#each DIAS as d}<option value={d.v}>{d.t}</option>{/each}
                    </select>
                    <span class="text-xs text-neutral-500">
                        Hay locales que pagan de viernes a jueves: si no coincide, las semanas quedan mal cortadas.
                    </span>
                </div>
            {/if}

            <p class="mt-3 rounded-md bg-neutral-50 p-2 text-xs text-neutral-600">
                Periodo en curso: <b>{cfg.periodo_actual.etiqueta}</b>
                ({cfg.periodo_actual.desde} al {cfg.periodo_actual.hasta})
            </p>
        </div>

        <!-- 2 -->
        <div class="mb-5 rounded-lg border p-4">
            <p class="mb-1 text-sm font-semibold">2. Que tan formal es la planilla</p>
            <p class="mb-3 text-xs text-neutral-500">
                Todo apagado es lo mas simple: sabes cuanto le pagas a cada uno y le imprimes su boleta.
                Enciende solo lo que uses. Apagar algo esconde sus conceptos, no borra nada.
            </p>

            {#each cfg.interruptores as i}
                <label class="flex cursor-pointer items-start gap-3 border-b py-3 text-sm last:border-0">
                    <input type="checkbox" bind:checked={i.activo} class="mt-0.5" />
                    <span class="flex-1">
                        <b class="font-medium">{i.titulo}</b>
                        <span class="block text-xs text-neutral-500">{i.ayuda}</span>
                    </span>
                </label>
            {/each}

            <p class="mt-3 text-xs text-neutral-500">
                {activos === 0
                    ? 'Nivel basico: control de personal y boleta simple.'
                    : `${activos} de ${cfg.interruptores.length} activados.`}
            </p>
        </div>

        <button class="rounded-md bg-sky-600 px-5 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                disabled={guardando} on:click={guardar}>
            {guardando ? 'Guardando...' : 'Guardar configuracion'}
        </button>
    {/if}
</div>
