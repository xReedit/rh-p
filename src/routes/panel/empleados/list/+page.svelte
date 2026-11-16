<script lang="ts">
    import Grid from "gridjs-svelte"
    import { h } from "gridjs";
    import { es_La } from '$root/services/es_La';
    import { fade } from 'svelte/transition'
    import { getData, postDataJSON } from '$root/services/httpClient.services'
    import { onMount } from "svelte";
	import { getValueToken } from "$root/services/login.services";
    import { goto } from "$app/navigation";
    import PanelHeader from '$root/components/PanelHeader.svelte';

    // La baja no borra: el D.S. 004-2006-TR obliga a guardar el registro de
    // jornada 5 anos. Solo deja de aparecer en el dia, los reportes y la planilla,
    // y se puede recuperar desde "Ver dados de baja".

    let todos: any[] = []
    let verBajas = false
    let error = ''
    let aviso = ''

    // dialogo de baja
    let sel: any = null
    let fbaja = ''
    let mbaja = ''
    let guardando = false

    const pagination = { limit: 10 }

    $: data = todos.filter(c => verBajas ? c.estado !== 0 : c.estado === 0)

    $: columns = [
        { id: 'idcolaborador', hidden: true },
        { data: (row: any) => row.nom_sede + ' ' + row.ciudad_sede, name: 'Lugar de Trabajo' },
        { data: (row: any) => row.nombres + ' ' + (row.apellidos || ''), name: 'Nombres' },
        verBajas
            ? { data: (row: any) => `${row.f_baja || ''} ${row.motivo_baja || ''}`.trim(), name: 'Baja' }
            : { id: 'ciudad', name: 'Ciudad' },
        {
            name: 'Accion',
            sort: false,
            formatter: (_cell: any, row: any) => {
                const c = todos.find(x => x.idcolaborador === row.cells[0].data)
                return h('div', { className: 'flex gap-1' }, [
                    h('button', {
                        className: 'btn btn-sm btn-primary',
                        title: 'Editar',
                        onClick: () => goto(`./file/datos?id=${c.idcolaborador}`)
                    }, '✎'),
                    verBajas
                        ? h('button', { className: 'btn btn-sm btn-success', onClick: () => reactivar(c) }, 'Recuperar')
                        : h('button', { className: 'btn btn-sm btn-danger', title: 'Ya no trabaja aca', onClick: () => abrirBaja(c) }, 'Dar de baja')
                ])
            }
        }
    ]

    onMount(getAll)

    async function getAll() {
        const _idOrg = getValueToken('idorg')
        todos = await getData('colaborador', `byIdorg/${_idOrg}`)
    }

    function nombre(c: any) { return `${c.nombres} ${c.apellidos || ''}`.trim() }

    function abrirBaja(c: any) {
        sel = c
        fbaja = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
        mbaja = ''
        error = ''
        aviso = ''
    }

    async function confirmarBaja() {
        if (!mbaja.trim()) { error = 'Escribe por que deja de trabajar.'; return }
        guardando = true
        error = ''
        try {
            const r = await postDataJSON('asistencia-rrhh', 'personal/baja', {
                idcolaborador: sel.idcolaborador, fecha: fbaja, motivo: mbaja.trim()
            })
            if (!r?.success) { throw new Error(r?.error || 'No se pudo dar de baja') }
            aviso = `${nombre(sel)} quedo dado de baja. Si fue un error, lo recuperas en "Ver dados de baja".`
            sel = null
            await getAll()
        } catch (e: any) {
            error = e.message
        }
        guardando = false
    }

    async function reactivar(c: any) {
        error = ''
        aviso = ''
        try {
            const r = await postDataJSON('asistencia-rrhh', 'personal/reactivar', { idcolaborador: c.idcolaborador })
            if (!r?.success) { throw new Error(r?.error || 'No se pudo recuperar') }
            aviso = `${nombre(c)} esta activo otra vez. Si marcaba con celular, tiene que volver a enrolarse.`
            await getAll()
        } catch (e: any) {
            error = e.message
        }
    }
</script>

<div class="max-w-5xl m-auto p-4" in:fade>
    <PanelHeader titulo="Empleados"
                 bajada="Aquí están todos los empleados de tu empresa."
                 volverA="/panel">
        <a class="btn btn-primary" href="./file/datos">
                <i class="fa fa-plus mr-1"></i>
                Agregar
            </a>
    </PanelHeader>

    <label class="flex items-center gap-2 py-2 text-sm cursor-pointer w-fit">
        <input type="checkbox" bind:checked={verBajas} />
        Ver dados de baja
    </label>

    {#if error}<p class="my-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>{/if}
    {#if aviso}<p class="my-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">{aviso}</p>{/if}

    {#key verBajas}
        <Grid {data} {columns} {pagination} language={es_La} sort search/>
    {/key}
</div>

{#if sel}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" transition:fade>
        <div class="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <p class="text-lg font-semibold">Dar de baja a {nombre(sel)}</p>
            <p class="mt-1 text-xs text-neutral-600">
                Deja de aparecer en el marcador, los reportes y la planilla. Su historial se guarda
                y lo puedes recuperar despues.
            </p>
            <label class="mt-4 block text-sm" for="fbaja">Ultimo dia de trabajo</label>
            <input id="fbaja" type="date" bind:value={fbaja} class="rounded-md border px-3 py-1.5 text-sm w-full" />
            <label class="mt-3 block text-sm" for="mbaja">Motivo</label>
            <input id="mbaja" type="text" bind:value={mbaja} maxlength="150"
                   placeholder="Renuncia, fin de contrato, despido..."
                   class="rounded-md border px-3 py-1.5 text-sm w-full" />
            {#if error}<p class="mt-2 text-sm text-red-600">{error}</p>{/if}
            <div class="mt-5 flex justify-end gap-2">
                <button class="btn btn-sm" on:click={() => { sel = null; error = '' }} disabled={guardando}>Cancelar</button>
                <button class="btn btn-sm btn-danger" on:click={confirmarBaja} disabled={guardando}>
                    {guardando ? 'Guardando...' : 'Dar de baja'}
                </button>
            </div>
        </div>
    </div>
{/if}
