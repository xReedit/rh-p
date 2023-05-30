<script lang="ts">
    import Grid from "gridjs-svelte"  
    import { h, Row } from "gridjs";
    import { es_La } from '$root/services/es_La';
    import Button from '$root/components/Button.svelte'
    import { fly } from 'svelte/transition'
    import { getData } from '$root/services/httpClient.services'
    import { onMount } from "svelte";
	import { getValueToken } from "$root/services/login.services";
    import { goto } from "$app/navigation";   

    let data: any = []
    let columns: any = []


    const pagination = {
        limit: 5
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

<div class="p-5" in:fly="{{ x: 200, duration: 200 }}">
    <div class="flex justify-between items-end">
        <div class="w-80">        
            <p class="text-xl font-medium">Empleados</p>
            <p class="font-light text-sm text-gray-600">Aquí están todos los empleados de tu empresa.</p>
        </div>
        <div class="w-40 flex flex-wrap justify-end text-right">
            <a class="btn btn-secondary mb-1" href="../">
                <i class="fa fa-arrow-left mr-1"></i>
                Atras
            </a>            
            <a class="btn btn-primary" href="./file/datos">
                <i class="fa fa-plus mr-1"></i>
                Agregar
            </a>            
        </div>
    </div>
    <br>

    <Grid {data} {columns} {pagination} language={es_La} sort search/>
    
</div>



