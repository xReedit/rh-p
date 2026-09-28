<script lang="ts">
    // Quien ve que locales.
    //
    // Sin esta pantalla el permiso solo se cambia con SQL, y en la practica no
    // se cambia nunca: queda el default para siempre y la funcion no existe.
    //
    // Solo entra quien administra TODOS los locales. Sin ese candado, un
    // usuario limitado a su local se asciende solo y los alcances son
    // decorativos. El servidor lo verifica igual: esto es la puerta, no la
    // cerradura.

    import { onMount } from 'svelte';
    import { isLogin } from '$root/services/login.services';
    import { fade } from 'svelte/transition';
    import { getData, putData } from '$root/services/httpClient.services';
    import Preload from '$root/components/Preload.svelte';
    import PanelHeader from '$root/components/PanelHeader.svelte';

    const ALCANCES = [
        { v: 'SEDE', t: 'Solo su local',
          d: 'Ve y edita unicamente el local al que pertenece. Es lo indicado para el encargado de un restaurante.' },
        { v: 'ASIGNADAS', t: 'Los locales que le asignes',
          d: 'Para el encargado de zona que lleva algunos de los locales, no todos.' },
        { v: 'EMPRESA', t: 'Todos los locales',
          d: 'Ve y edita todo, incluidos los locales que abran mas adelante. Es el centro de Recursos Humanos.' }
    ];

    let isPreloadShow = true;
    let error = '';
    let aviso = '';
    let sinPermiso = false;

    let usuarios: any[] = [];
    let sedes: any[] = [];
    let yo = 0;

    // --- edicion ---
    let editando: any = null;
    let alcance = 'SEDE';
    let elegidas: Record<number, boolean> = {};
    let guardando = false;

    onMount(async () => {
        await isLogin();
        await cargar();
        isPreloadShow = false;
    });

    async function cargar() {
        error = '';
        try {
            const r = await getData('asistencia-rrhh', 'usuarios');
            if (!r?.success) {
                // 403: el usuario no administra todos los locales. No es un
                // error que haya que arreglar, es que esta pantalla no es suya.
                sinPermiso = true;
                return;
            }
            usuarios = r.datos.usuarios;
            sedes = r.datos.sedes;
            yo = r.datos.yo;
        } catch (e: any) {
            error = e.message;
        }
    }

    function abrir(u: any) {
        editando = u;
        alcance = u.alcance;
        elegidas = {};
        for (const id of u.asignadas) { elegidas[id] = true; }
        aviso = '';
        error = '';
    }

    $: nElegidas = Object.values(elegidas).filter(Boolean).length;
    $: descripcion = ALCANCES.find(a => a.v === alcance)?.d || '';

    /** Como se resume el acceso de alguien en la lista. */
    function resumen(u: any): string {
        if (u.alcance === 'EMPRESA') { return 'Todos los locales'; }
        if (u.alcance === 'ASIGNADAS') {
            const n = u.asignadas.length;
            return `${n} local${n === 1 ? '' : 'es'} asignado${n === 1 ? '' : 's'}`;
        }
        return u.sede_propia_nombre || 'Solo su local';
    }

    async function guardar() {
        if (alcance === 'ASIGNADAS' && !nElegidas) {
            error = 'Elige al menos un local, o usa otro alcance.';
            return;
        }

        guardando = true;
        error = '';
        try {
            const resp = await putData('asistencia-rrhh', `usuarios/${editando.idusuario}/alcance`, {
                alcance,
                sedes: sedes.filter(s => elegidas[s.idsede]).map(s => s.idsede)
            });
            const r = await resp.json();
            if (!r?.success) { throw new Error(r?.error || 'No se pudo guardar'); }

            aviso = `Acceso de ${editando.nombres} actualizado.`;
            editando = null;
            await cargar();
        } catch (e: any) {
            error = e.message;
        }
        guardando = false;
    }
</script>

<div in:fade class="max-w-4xl m-auto p-4">
    <Preload isLoading={isPreloadShow} />

    <PanelHeader titulo="Usuarios y accesos"
                 bajada="Que locales ve y edita cada persona en Recursos Humanos."
                 volverA="/panel" />

    {#if sinPermiso}
        <div class="rounded-lg border bg-neutral-50 p-8 text-center text-sm text-neutral-600">
            <p class="font-medium">Esta pantalla es para quien administra todos los locales.</p>
            <p class="mt-1 text-xs">
                Si necesitas cambiar los accesos de alguien, pideselo a quien lleva Recursos Humanos.
            </p>
        </div>
    {:else}
        {#if error}
            <div class="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
        {/if}
        {#if aviso}
            <div class="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{aviso}</div>
        {/if}

        <div class="overflow-x-auto rounded-lg border">
            <table class="w-full text-sm">
                <thead class="bg-neutral-50 text-left text-[11px] uppercase text-neutral-500">
                    <tr>
                        <th class="p-2">Usuario</th>
                        <th class="p-2">Su local</th>
                        <th class="p-2">Accede a</th>
                        <th class="p-2"></th>
                    </tr>
                </thead>
                <tbody>
                    {#each usuarios as u (u.idusuario)}
                        <tr class="border-t hover:bg-neutral-50">
                            <td class="p-2">
                                {u.nombres}
                                {#if u.idusuario === yo}
                                    <span class="ml-1 rounded bg-sky-100 px-1.5 text-[10px] font-semibold text-sky-700">tu</span>
                                {/if}
                                <span class="block text-[11px] text-neutral-400">{u.usuario}{u.cargo ? ' - ' + u.cargo : ''}</span>
                            </td>
                            <td class="p-2 text-neutral-500">{u.sede_propia_nombre || '-'}</td>
                            <td class="p-2 {u.alcance === 'EMPRESA' ? 'font-medium text-sky-700' : ''}">
                                {resumen(u)}
                            </td>
                            <td class="p-2 text-right">
                                <button class="btn-link text-sky-600 hover:underline"
                                        on:click={() => abrir(u)}>Cambiar</button>
                            </td>
                        </tr>
                    {:else}
                        <tr><td colspan="4" class="p-6 text-center text-neutral-500">
                            No hay usuarios cargados.
                        </td></tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <p class="mt-3 text-xs text-neutral-500">
            Los usuarios se crean solos la primera vez que alguien entra desde el POS, y nacen viendo
            <strong>solo su local</strong>. Ampliarles el acceso es una decision que se toma aqui.
        </p>
    {/if}
</div>

{#if editando}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" transition:fade={{ duration: 120 }}>
        <div class="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div class="border-b p-4">
                <p class="font-semibold">{editando.nombres}</p>
                <p class="text-xs text-neutral-500">
                    Su local es {editando.sede_propia_nombre || 'el que tenga asignado'}.
                </p>
            </div>

            <div class="max-h-[60vh] overflow-y-auto p-4">
                {#if error}
                    <div class="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">{error}</div>
                {/if}

                {#each ALCANCES as a}
                    <label class="flex cursor-pointer items-start gap-2 border-b py-3 text-sm last:border-0">
                        <input type="radio" bind:group={alcance} value={a.v} class="mt-0.5" />
                        <span>
                            <b class="font-medium">{a.t}</b>
                            <span class="block text-xs text-neutral-500">{a.d}</span>
                        </span>
                    </label>
                {/each}

                {#if alcance === 'ASIGNADAS'}
                    <div class="mt-3 rounded-md border p-3">
                        <p class="mb-2 text-[11px] font-semibold uppercase text-neutral-500">
                            Locales ({nElegidas} elegido{nElegidas === 1 ? '' : 's'})
                        </p>
                        {#each sedes as s}
                            <label class="flex items-center gap-2 border-b py-1.5 text-sm last:border-0">
                                <input type="checkbox" bind:checked={elegidas[s.idsede]} />
                                <span class="flex-1">
                                    {s.nombre}
                                    {#if s.idsede === editando.sede_propia}
                                        <span class="text-[11px] text-neutral-400">(su local)</span>
                                    {/if}
                                </span>
                                <span class="text-[11px] text-neutral-400">{s.personal} persona(s)</span>
                            </label>
                        {/each}
                        <p class="mt-2 text-[11px] text-neutral-500">
                            Su propio local se incluye siempre, aunque no lo marques: nadie deberia quedar
                            sin acceso al local donde trabaja por un olvido.
                        </p>
                    </div>
                {/if}

                {#if editando.idusuario === yo && alcance !== 'EMPRESA'}
                    <p class="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900">
                        No puedes quitarte a ti mismo el acceso a todos los locales: si eres el unico que
                        lo tiene, nadie podria devolvertelo desde aqui.
                    </p>
                {/if}
            </div>

            <div class="flex justify-end gap-2 border-t p-4">
                <button class="rounded-md px-4 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100"
                        on:click={() => { editando = null; error = ''; }}>Cancelar</button>
                <button class="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
                        disabled={guardando || (editando.idusuario === yo && alcance !== 'EMPRESA')}
                        on:click={guardar}>
                    {guardando ? 'Guardando...' : 'Guardar'}
                </button>
            </div>
        </div>
    </div>
{/if}
