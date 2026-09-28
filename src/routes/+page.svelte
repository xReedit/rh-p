<script lang="ts">
    // La entrada a Recursos Humanos.
    //
    // Antes esta ruta no existia: ir a la raiz daba 404. Y el propio SSO,
    // cuando las credenciales no sirven, redirige justamente aqui -- asi que el
    // camino de error terminaba en una pagina rota.
    //
    // La clave se valida CONTRA EL POS, no contra una copia. Cambiarla alla
    // vale aqui en el acto.
    //
    // Aun asi el primer ingreso tiene que ser por el POS: lo que falta no es la
    // clave sino la ficha de Recursos Humanos -- la que dice que locales puede
    // ver cada uno -- y esa la crea el ingreso por SSO. Se avisa abajo, porque
    // es la duda que va a tener el que no pueda entrar.

    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { fade } from 'svelte/transition';
    import { PUBLIC_API_KEY } from '$env/static/public';
    import { getData } from '$root/services/httpClient.services';
    import { elegirSede } from '$root/services/sede.store';

    let usuario = '';
    let pass = '';
    let error = '';
    let entrando = false;
    let listo = false;

    // Paso 2: elegir local. Solo aparece si la persona administra varios.
    let sedes: any[] = [];
    let eligiendo = false;

    /** Las dos primeras letras, igual que el selector de la barra. */
    const inicial = (nombre: string) =>
        (nombre || '?').trim().replace(/^(EL|LA|LOS|LAS)\s+/i, '').slice(0, 2).toUpperCase();

    onMount(() => {
        // Con sesion abierta no tiene sentido pedir la clave otra vez
        try {
            if (localStorage.getItem('token')) { goto('/panel'); return; }
        } catch (e) { /* modo privado */ }
        listo = true;
    });

    async function entrar() {
        if (!usuario.trim() || !pass) {
            error = 'Escribe tu usuario y tu clave.';
            return;
        }

        entrando = true;
        error = '';

        // Se olvida el local de la sesion anterior ANTES de entrar: en una
        // computadora compartida, el que entra despues no tiene por que caer
        // en el local del que entro antes -- ni deberia poder.
        elegirSede(0, '');
        try {
            const r = await fetch(`${PUBLIC_API_KEY}/login-panel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ usuario: usuario.trim(), pass })
            });
            const d = await r.json();

            if (!r.ok) { throw new Error(d?.error || 'No se pudo entrar.'); }

            localStorage.setItem('token', d.token);

            // Con varios locales hay que preguntar cual: entrar al que quedo
            // guardado de la vez anterior es como empezar a trabajar sin mirar
            // donde estas parado.
            const r2 = await getData('asistencia-rrhh', 'sedes');
            const lista = r2?.success ? r2.datos.sedes : [];

            if (lista.length > 1) {
                sedes = lista;
                eligiendo = true;
                entrando = false;
                return;
            }

            // Uno solo (o no se pudo consultar): se entra derecho
            if (lista.length === 1) { elegirSede(lista[0].idsede, lista[0].nombre); }
            irAlPanel();
        } catch (e: any) {
            error = e.message;
            pass = '';
        }
        entrando = false;
    }

    function entrarA(s: any) {
        elegirSede(s.idsede, s.nombre);
        irAlPanel();
    }

    /**
     * Se entra al panel con una recarga entera, no con goto().
     *
     * La barra de arriba vive en el layout, que se monta UNA sola vez. Cuando
     * se monto, esta pantalla todavia no tenia token: el selector de local
     * pregunto, no habia con que, y se quedo vacio para siempre -- navegar con
     * goto() no lo vuelve a montar. El sintoma era una barra sin el nombre del
     * local ni el del usuario, justo despues de entrar.
     *
     * Recargar cuesta un instante y pasa una vez por sesion. A cambio, todo lo
     * que lee el token lo lee con el token ya puesto.
     */
    function irAlPanel() {
        location.href = '/panel';
    }
</script>

<svelte:head><title>Recursos Humanos</title></svelte:head>

{#if listo}
    <div in:fade class="flex min-h-screen items-start justify-center bg-neutral-100 p-4">
        {#if eligiendo}
            <div class="mt-[12vh] w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
                <p class="text-xl font-bold">A que local entras?</p>
                <p class="mt-0.5 text-xs text-neutral-600">
                    Administras {sedes.length} locales. Vas a poder cambiar desde la barra de arriba.
                </p>

                <!-- Tarjetas separadas y no una lista pegada: cada local es una
                     decision, y hay que poder distinguir donde termina uno y
                     empieza el otro de un vistazo. -->
                <div class="local-lista">
                    {#each sedes as s}
                        <button class="local" on:click={() => entrarA(s)}>
                            <span class="local-chip">{inicial(s.nombre)}</span>
                            <span class="local-txt">
                                <b>{s.nombre}</b>
                                <span>
                                    {s.ciudad ? s.ciudad : 'Sin ciudad'}
                                    &middot; {s.personal} persona{s.personal === 1 ? '' : 's'}
                                </span>
                            </span>
                            <i class="fa-solid fa-angle-right local-flecha"></i>
                        </button>
                    {/each}
                </div>
            </div>
        {:else}
        <div class="mt-[12vh] w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
            <p class="text-xl font-bold">Recursos Humanos</p>
            <p class="mt-0.5 text-xs text-neutral-600">
                Entra con el mismo usuario y clave que usas en el POS.
            </p>

            {#if error}
                <div class="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {error}
                </div>
            {/if}

            <form class="mt-4" on:submit|preventDefault={entrar}>
                <label class="mb-1 block text-[11px] font-semibold uppercase text-neutral-500" for="u">
                    Usuario
                </label>
                <input id="u" type="text" bind:value={usuario} autocomplete="username"
                       autocapitalize="none" spellcheck="false"
                       class="mb-3 w-full rounded-md border px-3 py-2 text-sm" />

                <label class="mb-1 block text-[11px] font-semibold uppercase text-neutral-500" for="p">
                    Clave
                </label>
                <input id="p" type="password" bind:value={pass} autocomplete="current-password"
                       class="mb-4 w-full rounded-md border px-3 py-2 text-sm" />

                <button type="submit" disabled={entrando}
                        class="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white
                               hover:bg-sky-700 disabled:opacity-50">
                    {entrando ? 'Entrando...' : 'Entrar'}
                </button>
            </form>

            <p class="mt-4 border-t pt-3 text-xs text-neutral-500">
                <strong>Es tu primera vez?</strong> Entra una vez desde el POS, en
                <b>Recursos Humanos</b>. Despues vas a poder entrar directo por aqui.
            </p>
        </div>
        {/if}
    </div>
{/if}

<style>
    /* Mismo lenguaje que el selector de la barra de arriba: quien ve esta
       lista una vez reconoce el mismo cuadrito cuando cambia de local despues. */
    .local-lista {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .local {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #e9ecef;
        border-radius: 0.625rem;
        background: #fff;
        font: inherit;
        text-align: left;
        cursor: pointer;
        transition: border-color .15s, background-color .15s, transform .05s;
    }
    .local:hover { border-color: #7dd3fc; background: #f8fdff; }
    /* Se hunde apenas al apretar: confirma el clic en una pantalla que
       enseguida se va a recargar entera. */
    .local:active { transform: translateY(1px); }

    .local-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 0.5rem;
        background: #0284c7;
        color: #fff;
        font-size: 0.75rem;
        font-weight: 700;
    }

    .local-txt { flex: 1 1 auto; min-width: 0; }
    .local-txt b {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 0.875rem;
        font-weight: 600;
        color: #212529;
    }
    .local-txt span {
        display: block;
        margin-top: 0.0625rem;
        font-size: 0.6875rem;
        color: #868e96;
    }

    .local-flecha { flex: 0 0 auto; font-size: 0.75rem; color: #ced4da; }
    .local:hover .local-flecha { color: #0284c7; }
</style>
