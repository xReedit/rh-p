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
            regimenGuardado = cfg.regimen_laboral;
        } catch (e: any) {
            error = e.message;
        }
    }

    /**
     * El regimen con el que se cargo la pantalla.
     *
     * Sirve para saber si el usuario lo CAMBIO en esta edicion. Si lo cambio,
     * los interruptores los decide el servidor segun el regimen nuevo; si no,
     * mandan los que estan en pantalla.
     */
    let regimenGuardado = '';

    async function guardar() {
        guardando = true;
        error = '';
        try {
            const cuerpo: any = {
                regimen_laboral: cfg.regimen_laboral,
                rmv: cfg.rmv,
                frecuencia_pago: cfg.frecuencia_pago,
                semana_empieza: cfg.semana_empieza
            };
            // Los interruptores solo se mandan si el regimen NO cambio. Si
            // cambio, manda el regimen: mandarlos tambien pisaria lo que el
            // servidor acaba de acomodar segun la Ley MYPE.
            if (cfg.regimen_laboral === regimenGuardado) {
                for (const i of cfg.interruptores) { cuerpo[i.campo] = i.activo; }
            }
            cuerpo.sobretiempo_min_umbral = cfg.sobretiempo_min_umbral;

            const r = await postDataJSON('asistencia-rrhh', 'planilla/configuracion', cuerpo);
            if (!r?.success) { throw new Error(r?.error || 'No se pudo guardar'); }
            cfg = r.datos;
            // Si el regimen cambio, el servidor acomodo los interruptores: se
            // avisa, porque si no parece que la pantalla se movio sola.
            const acomodo = regimenGuardado && regimenGuardado !== cfg.regimen_laboral;
            regimenGuardado = cfg.regimen_laboral;
            aviso = acomodo
                ? 'Configuracion guardada. Se ajustaron CTS, gratificaciones y EsSalud a lo que corresponde al regimen elegido.'
                : 'Configuracion guardada.';
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
            <p class="mb-1 text-sm font-semibold">1. Que regimen es tu empresa</p>
            <p class="mb-3 text-xs text-neutral-500">
                Lo dice tu ficha del REMYPE. De esto depende que beneficios corresponden:
                no es una eleccion, lo fija la Ley MYPE.
            </p>

            <div class="grid gap-2 md:grid-cols-3">
                {#each cfg.regimenes as reg}
                    <label class="cursor-pointer rounded-lg border p-3 text-sm
                                  {cfg.regimen_laboral === reg.clave ? 'border-sky-500 bg-sky-50' : 'hover:bg-neutral-50'}">
                        <span class="flex items-center gap-2">
                            <input type="radio" bind:group={cfg.regimen_laboral} value={reg.clave} />
                            <b class="font-medium">{reg.titulo}</b>
                        </span>
                        <span class="mt-1 block text-xs text-neutral-500">{reg.ayuda}</span>
                    </label>
                {/each}
            </div>

            {#if cfg.regimen_laboral !== regimenGuardado}
                <p class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                    Al guardar se van a ajustar <b>CTS</b>, <b>gratificaciones</b> y <b>EsSalud</b>
                    a lo que corresponde a este regimen.
                </p>
            {/if}

            <div class="mt-4 flex items-center gap-2 border-t pt-3 text-sm">
                <label for="rmv">Remuneracion minima vigente</label>
                <span class="text-neutral-500">S/</span>
                <input id="rmv" type="number" min="1" step="10" bind:value={cfg.rmv}
                       class="w-28 rounded-md border px-2 py-1 text-sm" />
            </div>
            <p class="mt-1 text-xs text-neutral-500">
                Se usa para avisar cuando un sueldo queda por debajo del minimo. Cambia por
                decreto: actualizalo aqui el dia que suba, sin esperar una actualizacion del sistema.
            </p>
        </div>

        <!-- 2 -->
        <div class="mb-5 rounded-lg border p-4">
            <p class="mb-1 text-sm font-semibold">2. Cada cuanto se paga</p>
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
            <p class="mb-1 text-sm font-semibold">3. Que tan formal es la planilla</p>
            <p class="mb-3 text-xs text-neutral-500">
                Todo apagado es lo mas simple: sabes cuanto le pagas a cada uno y le imprimes su boleta.
                Enciende solo lo que uses. Apagar algo esconde sus conceptos, no borra nada.
            </p>

            {#each cfg.interruptores as i}
                <div class="border-b py-3 last:border-0">
                    <label class="flex cursor-pointer items-start gap-3 text-sm">
                        <input type="checkbox" bind:checked={i.activo} class="mt-0.5" />
                        <span class="flex-1">
                            <b class="font-medium">{i.titulo}</b>
                            <span class="block text-xs text-neutral-500">{i.ayuda}</span>
                        </span>
                    </label>

                    <!-- El umbral va pegado a SU interruptor y solo si esta
                         encendido: suelto en la pantalla no se entiende de que
                         habla, y apagado no sirve para nada. -->
                    {#if i.clave === 'sobretiempo' && i.activo}
                        <div class="mt-2 ml-7 rounded-md bg-neutral-50 p-3">
                            <label class="flex items-center gap-2 text-sm" for="umbral">
                                No contar como hora extra hasta
                                <input id="umbral" type="number" min="0" max="120"
                                       bind:value={cfg.sobretiempo_min_umbral}
                                       class="w-20 rounded-md border px-2 py-1 text-sm" />
                                minutos
                            </label>
                            <p class="mt-1 text-xs text-neutral-500">
                                En un restaurante la gente llega antes y se queda despues. Sin este
                                margen, cinco minutos de anticipacion todos los dias serian horas
                                extra todos los dias. Pasado el margen se paga <b>todo</b> el exceso,
                                no el exceso menos estos minutos.
                            </p>
                        </div>
                    {/if}
                </div>
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
