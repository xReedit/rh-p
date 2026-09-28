<script lang="ts">
    // El local en el que se esta trabajando, en la barra de arriba.
    //
    // POR QUE AQUI Y NO EN CADA PANTALLA
    // Antes era un combo repetido en las cinco pantallas de asistencia: ocupaba
    // el ancho completo, empujaba el contenido hacia abajo y aparecia cinco
    // veces diciendo lo mismo. Un dato que no cambia al navegar no tiene por
    // que ocupar espacio en cada pagina: va una vez, arriba, donde uno mira
    // para saber donde esta parado.
    //
    // Sigue siendo VISIBLE siempre, porque el riesgo real no es equivocarse de
    // boton: es programar los horarios de un local creyendo que se esta en otro.

    import { onMount } from 'svelte';
    import { page } from '$app/stores';
    import { getData } from '$root/services/httpClient.services';
    import { sedeActiva, elegirSede, iniciarSede } from '$root/services/sede.store';

    let sedes: any[] = [];
    let abierto = false;
    let listo = false;

    $: actual = sedes.find(s => s.idsede === $sedeActiva) || sedes[0];
    $: enPanel = $page.url.pathname.startsWith('/panel');

    /** Las dos primeras letras, para el cuadrito de cada local. */
    const inicial = (nombre: string) =>
        (nombre || '?').trim().replace(/^(EL|LA|LOS|LAS)\s+/i, '').slice(0, 2).toUpperCase();

    onMount(cargar);

    async function cargar() {
        try {
            if (!localStorage.getItem('token')) { return; }
        } catch (e) { return; }

        iniciarSede();
        try {
            const r = await getData('asistencia-rrhh', 'sedes');
            if (r?.success) {
                sedes = r.datos.sedes;
                const vale = sedes.some(s => s.idsede === $sedeActiva);
                if (!vale) { elegirSede(r.datos.idsede_token || 0, ''); }
            }
        } catch (e) {
            // Sin lista no se muestra nada. La barra no puede romper la app.
        }
        listo = true;
    }

    function cambiar(s: any) {
        abierto = false;
        if (s.idsede === $sedeActiva) { return; }

        elegirSede(s.idsede, s.nombre);

        // Recarga completa a proposito: cada pantalla trae sus datos al montarse
        // y no hay un lugar donde avisarles a todas. Cambiar de local es algo
        // que se hace pocas veces al dia; una recarga es el precio correcto por
        // la certeza de que NADA quedo mostrando el local anterior.
        location.reload();
    }
</script>

<!-- Cerrar con un clic afuera o con Escape: las dos son reflejo -->
<svelte:window on:click={() => (abierto = false)}
               on:keydown={(e) => { if (e.key === 'Escape') { abierto = false; } }} />

{#if listo && enPanel && sedes.length}
    <div class="relative" on:click|stopPropagation on:keydown|stopPropagation role="presentation">

        {#if sedes.length > 1}
            <button class="sede-trigger" class:abierto on:click={() => (abierto = !abierto)}
                    aria-expanded={abierto} aria-haspopup="listbox">
                <span class="sede-chip">{inicial(actual?.nombre)}</span>
                <span class="sede-nombre">{actual?.nombre || 'Elegir local'}</span>
                <i class="fa-solid fa-angle-down sede-flecha"></i>
            </button>
        {:else}
            <!-- Un solo local: se muestra, pero no invita a tocar algo que no
                 tiene alternativas. -->
            <div class="sede-trigger sede-fijo">
                <span class="sede-chip">{inicial(actual?.nombre)}</span>
                <span class="sede-nombre">{actual?.nombre || ''}</span>
            </div>
        {/if}

        {#if abierto}
            <div class="sede-menu" role="listbox">
                <div class="sede-menu-cab">
                    <span>Cambiar de local</span>
                    <span class="sede-menu-cuenta">{sedes.length}</span>
                </div>

                <div class="sede-lista">
                    {#each sedes as s}
                        {@const activo = s.idsede === $sedeActiva}
                        <button class="sede-item" class:activo role="option" aria-selected={activo}
                                on:click={() => cambiar(s)}>
                            <span class="sede-chip sede-chip-lista" class:activo>{inicial(s.nombre)}</span>
                            <span class="sede-item-txt">
                                <b>{s.nombre}</b>
                                <span>
                                    {s.ciudad ? s.ciudad : 'Sin ciudad'}
                                    &middot; {s.personal} persona{s.personal === 1 ? '' : 's'}
                                </span>
                            </span>
                            {#if activo}
                                <i class="fa-solid fa-circle-check sede-check"></i>
                            {/if}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
{/if}

<style>
    /* El disparador vive sobre la barra oscura: los colores son translucidos
       para que funcione sin depender del tono exacto del fondo. */
    .sede-trigger {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        max-width: 15rem;
        padding: 0.25rem 0.5rem 0.25rem 0.25rem;
        border: 0;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.08);
        color: #f4f4f5;
        font: inherit;
        font-size: 0.8125rem;
        cursor: pointer;
        transition: background-color .15s;
    }
    .sede-trigger:hover,
    .sede-trigger.abierto { background: rgba(255, 255, 255, 0.16); }

    /* Sin alternativas no se comporta como boton */
    .sede-fijo { cursor: default; background: rgba(255, 255, 255, 0.06); }

    .sede-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 9999px;
        background: #0284c7;
        color: #fff;
        font-size: 0.625rem;
        font-weight: 700;
        letter-spacing: .02em;
    }

    /* Un nombre largo se corta con puntos suspensivos en vez de estirar la barra */
    .sede-nombre {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-weight: 600;
    }

    .sede-flecha {
        flex: 0 0 auto;
        font-size: 0.625rem;
        opacity: .6;
        transition: transform .15s;
    }
    .sede-trigger.abierto .sede-flecha { transform: rotate(180deg); }

    .sede-menu {
        position: absolute;
        left: 0;
        top: calc(100% + 0.5rem);
        z-index: 50;
        width: 17rem;
        overflow: hidden;
        border-radius: 0.75rem;
        background: #fff;
        box-shadow: 0 10px 30px rgba(16, 24, 40, .18), 0 0 0 1px rgba(16, 24, 40, .06);
    }

    .sede-menu-cab {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.625rem 0.875rem;
        border-bottom: 1px solid #f1f3f5;
        font-size: 0.6875rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: .04em;
        color: #6c757d;
    }
    .sede-menu-cuenta {
        padding: 0.0625rem 0.4375rem;
        border-radius: 9999px;
        background: #f1f3f5;
        color: #495057;
        letter-spacing: 0;
    }

    /* Con muchos locales la lista scrollea en vez de salirse de la pantalla */
    .sede-lista { max-height: 60vh; overflow-y: auto; padding: 0.25rem; }

    .sede-item {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        width: 100%;
        padding: 0.5rem 0.625rem;
        border: 0;
        border-radius: 0.5rem;
        background: transparent;
        font: inherit;
        text-align: left;
        cursor: pointer;
    }
    .sede-item:hover { background: #f8f9fa; }
    .sede-item.activo { background: #f0f9ff; }

    .sede-chip-lista { background: #e9ecef; color: #495057; }
    .sede-chip-lista.activo { background: #0284c7; color: #fff; }

    .sede-item-txt { flex: 1 1 auto; min-width: 0; }
    .sede-item-txt b {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #212529;
    }
    .sede-item-txt span {
        display: block;
        font-size: 0.6875rem;
        color: #868e96;
    }

    .sede-check { flex: 0 0 auto; color: #0284c7; font-size: 0.875rem; }

    @media (max-width: 640px) {
        /* En celular el nombre se esconde: quedan el cuadrito y la flecha, que
           alcanzan para saber donde estas sin comerse la barra. */
        .sede-nombre { display: none; }
        .sede-trigger { max-width: none; }
        .sede-menu { width: 15rem; }
    }
</style>
