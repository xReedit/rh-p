<script lang="ts">
    import Grid from "gridjs-svelte"  
    import { h, Row } from "gridjs";
    import { es_La } from '$root/services/es_La';
    import Button from '$root/components/Button.svelte'
    import { fly, fade } from 'svelte/transition'
    import { getData } from '$root/services/httpClient.services'
    import { onMount } from "svelte";
	import { getValueToken } from "$root/services/login.services";
    import { goto } from "$app/navigation";   
    import PanelHeader from '$root/components/PanelHeader.svelte';

    let data: any = []
    let columns: any = []


    const pagination = {
        limit: 10
    }

    onMount(async () => {        
        getAll()
    })

    const getAll = async () => {
        const _idOrg = getValueToken('idorg')        
        data = await getData('colaborador', `byIdorg/${_idOrg}`)

        columns = [
            {
                id: 'idcolaborador',
                hidden: true
            },
            {
                data: (row:any) => row.nom_sede + ' ' + row.ciudad_sede,
                name: 'Lugar de Trabajo'
            }, {
                data: (row:any) => row.nombres + ' ' + row.apellidos,
                name: 'Nombres',
            }, {
                id: 'ciudad',
                name: 'Ciudad'
            },
            {
                name: 'Accion',
                formatter: (cell, row) => {
                return h('button', {
                    className: 'btn btn-sm btn-primary',
                    onClick: () => goColaboradorId(row.cells[0].data)
                }, '✎');
                }
            }
        ]
    }

    const goColaboradorId = (id: number) => {
        const _url = `./file/datos?id=${id}`
        goto(_url)
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


    <Grid {data} {columns} {pagination} language={es_La} sort search/>
    
</div>



