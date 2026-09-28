<script lang="ts">
    // El encabezado de una pantalla del panel.
    //
    // Existe porque cada pagina se armaba el suyo: distintos tamanos de titulo,
    // anchos fijos (`w-80`, `w-40`) que se rompen en pantallas chicas, y el
    // boton de Volver a veces como bloque gris y a veces como enlace. Nada de
    // eso es grave por separado; junto es lo que hace que la app se vea armada
    // a pedazos.
    //
    // La accion secundaria (volver) va a la DERECHA y discreta, y la principal
    // destacada al lado: si las dos pesan igual, la que mas se aprieta por
    // error es la de salir.

    import { goto } from '$app/navigation';

    export let titulo: string;
    export let bajada = '';
    /** A donde vuelve. Vacio = sin boton de volver. */
    export let volverA = '';
    export let volverTexto = 'Volver';
</script>

<div class="flex flex-wrap items-start justify-between gap-3 pb-3">
    <div class="min-w-0 flex-1">
        <p class="text-xl font-bold">{titulo}</p>
        {#if bajada}
            <p class="mt-0.5 text-xs text-neutral-600">{bajada}</p>
        {/if}
    </div>

    <div class="flex shrink-0 flex-wrap items-center gap-2">
        <!-- Lo que cada pantalla quiera poner: crear, exportar, configurar -->
        <slot />

        {#if volverA}
            <button class="btn-link text-sm text-neutral-600 hover:text-black"
                    on:click={() => goto(volverA)}>
                <i class="fa-solid fa-arrow-left"></i> {volverTexto}
            </button>
        {/if}
    </div>
</div>
