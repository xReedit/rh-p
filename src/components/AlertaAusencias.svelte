<script lang="ts">
    // El aviso de que hay gente sin marcar.
    //
    // Vive en un componente porque tiene que aparecer en los tres lugares por
    // donde se pasa antes de que el problema cueste plata: al entrar al panel,
    // en Control de Asistencia y -- sobre todo -- en la pantalla que manda los
    // descuentos a la boleta. Un aviso que solo esta en la pantalla a la que
    // nadie entra no sirve de nada.
    //
    // Consulta en silencio: si la API no responde, la pantalla que lo contiene
    // sigue funcionando. Es un aviso, no un requisito.

    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { getData } from '$root/services/httpClient.services';

    /** 'banner' ocupa el ancho; 'linea' es una sola frase para meter en una cabecera. */
    export let variante: 'banner' | 'linea' = 'banner';
    /** Texto extra segun donde aparezca: en planilla el riesgo es distinto. */
    export let contexto = '';
    /** Cuantas hay, para quien lo incluye (bind:cantidad). Evita una segunda consulta. */
    export let cantidad = 0;
    /**
     * Invitar a activar el modulo cuando todavia no se usa.
     *
     * Solo se enciende en la pantalla de entrada: repetir la misma invitacion
     * en cada pantalla la convierte en algo que se aprende a ignorar.
     */
    export let invitar = false;

    let alertas: any[] = [];
    let estado: any = null;
    let listo = false;

    onMount(async () => {
        try {
            const r = await getData('asistencia-rrhh', 'ausencias/alertas');
            if (r?.success) {
                alertas = r.datos.alertas;
                cantidad = alertas.length;
                estado = r.datos;
            }
        } catch (e) {
            // Silencio a proposito: ver el aviso es util, no poder ver la
            // pantalla porque el aviso fallo no lo es.
        }
        listo = true;
    });

    $: nombres = alertas.slice(0, 3).map(a => a.nombres).join(', ')
        + (alertas.length > 3 ? ` y ${alertas.length - 3} mas` : '');
</script>

<!-- Sin marcadores nadie PUEDE marcar, asi que todo el personal saldria como
     ausente: el aviso seria una alarma que suena siempre. En ese caso se
     invita a activarlo, que es lo que realmente falta. -->
{#if listo && estado && !estado.operativo && invitar}
    <div class="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-left">
        <p class="text-sm font-semibold text-sky-900">
            <i class="fa-solid fa-mobile-screen-button mr-1"></i>
            Activa el Control de Asistencia
        </p>
        <p class="mt-1 text-xs text-sky-900">
            El personal marca entrada y salida escaneando un QR con su celular. Con eso, las tardanzas,
            las faltas y los dias de descanso trabajados entran solos a la boleta, sin sacar cuentas a mano.
        </p>
        <p class="mt-2 text-xs text-sky-800">
            Se configura desde el POS, en <b>Control de Asistencia</b>:
            {#if !estado.marcadores}
                falta crear el primer marcador (la pantalla que muestra el QR).
            {:else if !estado.con_dispositivo}
                ya hay marcador; falta vincular el celular del personal.
            {:else}
                falta terminar de configurarlo.
            {/if}
        </p>
    </div>
{/if}

{#if listo && alertas.length}
    {#if variante === 'linea'}
        <button class="flex w-full items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-left text-xs text-amber-800 hover:bg-amber-100"
                on:click={() => goto('/panel/asistencia/ausencias')}>
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span class="flex-1">
                {alertas.length} persona(s) llevan dias sin marcar{contexto ? ' — ' + contexto : ''}
            </span>
            <span class="font-semibold underline">Revisar</span>
        </button>
    {:else}
        <div class="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left">
            <div class="flex flex-wrap items-center gap-3">
                <div class="flex-1 min-w-[220px]">
                    <p class="text-sm font-semibold text-amber-900">
                        <i class="fa-solid fa-triangle-exclamation mr-1"></i>
                        {alertas.length} persona(s) llevan dias sin marcar
                    </p>
                    <p class="mt-0.5 text-xs text-amber-800">{nombres}.</p>
                    <p class="mt-1 text-xs text-amber-800">
                        {contexto ||
                            'Si estan de vacaciones o ya no trabajan, hay que decirlo: mientras tanto esos dias se cuentan como falta y se descuentan de la boleta.'}
                    </p>
                </div>
                <button class="rounded-md bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700"
                        on:click={() => goto('/panel/asistencia/ausencias')}>Resolver</button>
            </div>
        </div>
    {/if}
{/if}
