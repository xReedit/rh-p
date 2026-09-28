<script lang="ts">
    // Quien esta usando el sistema, y como salir.
    //
    // POR QUE SE MUESTRA EL USUARIO
    // La computadora de la oficina la usan varios. Saber con que usuario se
    // esta trabajando importa: las acciones de Recursos Humanos quedan en la
    // bitacora a nombre de quien entro, no de quien esta sentado.
    //
    // POR QUE SALIR ESTA DENTRO DE UN MENU Y NO ES UN BOTON SUELTO
    // Un clic al lado del selector de local no puede cerrar la sesion. Los dos
    // clics que cuesta abrir el menu son la confirmacion: alcanzan para no
    // hacerlo sin querer, y no molestan al que si quiere salir.

    import { goto } from '$app/navigation';
    import { elegirSede } from '$root/services/sede.store';

    let abierto = false;

    /**
     * El nombre de usuario sale del propio token.
     *
     * Se lee sin verificar la firma A PROPOSITO: aqui solo sirve para mostrar
     * un texto. Lo que de verdad decide que puede hacer cada uno lo verifica
     * el servidor en cada pedido, con la firma.
     */
    function quienEsta(): string {
        try {
            const t = localStorage.getItem('token');
            if (!t) { return ''; }
            const d = JSON.parse(atob(t.split('.')[1]));
            // El nombre de la persona antes que el usuario interno: quien entra
            // como "easoporte" no se reconoce en un "SISTEMA".
            return d.nombres || d.usuario || '';
        } catch (e) {
            return '';
        }
    }

    const usuario = quienEsta();

    const inicial = (u: string) => (u || '?').trim().slice(0, 2).toUpperCase();

    function salir() {
        // Se borra el local ademas del token: en una computadora compartida el
        // que entra despues no tiene por que caer donde estaba el anterior.
        try {
            localStorage.removeItem('token');
        } catch (e) { /* modo privado */ }
        elegirSede(0, '');

        // Recarga entera en vez de navegar: asi no queda ni un dato del que
        // salio en la memoria de la pagina.
        location.href = '/';
    }
</script>

<svelte:window on:click={() => (abierto = false)}
               on:keydown={(e) => { if (e.key === 'Escape') { abierto = false; } }} />

<div class="relative" on:click|stopPropagation on:keydown|stopPropagation role="presentation">
    <button class="ses-trigger" class:abierto on:click={() => (abierto = !abierto)}
            aria-expanded={abierto} aria-haspopup="menu" title="Tu sesion">
        <span class="ses-chip">{inicial(usuario)}</span>
        <i class="fa-solid fa-angle-down ses-flecha"></i>
    </button>

    {#if abierto}
        <div class="ses-menu" role="menu">
            <div class="ses-cab">
                <span class="ses-chip ses-chip-menu">{inicial(usuario)}</span>
                <span class="ses-cab-txt">
                    <b>{usuario || 'Sesion abierta'}</b>
                    <span>Recursos Humanos</span>
                </span>
            </div>

            <button class="ses-salir" role="menuitem" on:click={salir}>
                <i class="fa-solid fa-right-from-bracket"></i>
                Cerrar sesion
            </button>
        </div>
    {/if}
</div>

<style>
    /* Mismo lenguaje que el selector de local: vive sobre la barra oscura */
    .ses-trigger {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.25rem 0.5rem 0.25rem 0.25rem;
        border: 0;
        border-radius: 9999px;
        background: rgba(255, 255, 255, 0.08);
        color: #f4f4f5;
        font: inherit;
        cursor: pointer;
        transition: background-color .15s;
    }
    .ses-trigger:hover,
    .ses-trigger.abierto { background: rgba(255, 255, 255, 0.16); }

    .ses-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 9999px;
        background: #475569;
        color: #fff;
        font-size: 0.625rem;
        font-weight: 700;
    }

    .ses-flecha { font-size: 0.625rem; opacity: .6; transition: transform .15s; }
    .ses-trigger.abierto .ses-flecha { transform: rotate(180deg); }

    /* Anclado a la DERECHA: es el ultimo elemento de la barra y si se abriera
       hacia la izquierda se saldria de la pantalla en celular. */
    .ses-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 0.5rem);
        z-index: 50;
        width: 14rem;
        overflow: hidden;
        border-radius: 0.75rem;
        background: #fff;
        box-shadow: 0 10px 30px rgba(16, 24, 40, .18), 0 0 0 1px rgba(16, 24, 40, .06);
    }

    .ses-cab {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        padding: 0.75rem 0.875rem;
        border-bottom: 1px solid #f1f3f5;
    }
    .ses-chip-menu { width: 2rem; height: 2rem; font-size: 0.75rem; }

    .ses-cab-txt { min-width: 0; }
    .ses-cab-txt b {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.8125rem;
        font-weight: 600;
        color: #212529;
    }
    .ses-cab-txt span { display: block; font-size: 0.6875rem; color: #868e96; }

    .ses-salir {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.625rem 0.875rem;
        border: 0;
        background: transparent;
        font: inherit;
        font-size: 0.8125rem;
        font-weight: 500;
        color: #c92a2a;
        text-align: left;
        cursor: pointer;
    }
    .ses-salir:hover { background: #fff5f5; }
</style>
