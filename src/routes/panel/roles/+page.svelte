<script lang="ts">
    import { onMount } from 'svelte';
    import { getValueToken, isLogin } from '$root/services/login.services'    
    import { goto } from "$app/navigation";   
    import { fly } from 'svelte/transition'
    import { postData, getData } from '$root/services/httpClient.services'
    import Button from '$root/components/Button.svelte'
	import Modal from '$root/components/Modal.svelte';
	import { es_La } from '$root/services/es_La';
	import Grid from "gridjs-svelte"  
	import { h } from 'gridjs';

    let showModal = false
    let descripcionRol = ''
    let _loaderStatus = 0
    let data = []
    let columns = [];

    function handleToggleModal() {
        showModal = !showModal
    }

    onMount(async () => {        
        isLogin()
        loadData()
    })

    function goBack() {
        goto('./')
    }

    async function loadData() {
        const _idSede = getValueToken('idsede')
        data = await getData('rol', `byListColaborador/${_idSede}`)

        columns = [
            {
                id: 'idrol',
                hidden: true
            }, {
                id: 'descripcion',
                name: 'Descripcion'
            },
            , {
                id: 'cantidad',
                name: 'Empleados'
            },
            // {
            //     name: 'Accion',
            //     formatter: (cell, row) => {
            //     return h('button', {
            //         className: 'btn btn-sm btn-primary',
            //         onClick: () => goColaboradorId(row.cells[0].data)
            //     }, '✎');
            //     }
            // }
        ]
    }

    
    async function guardarRol() {
        if ( descripcionRol.length === 0 ) {return;}

        const _payload = {
            descripcion: descripcionRol.toUpperCase()
        }

        _loaderStatus = 1
        const rpt = await postData('rol','create', _payload)        
        if (rpt.status === 200) {
            _loaderStatus = 2
            setTimeout(() => {
                showModal = false;                
                newRol()
                loadData()
            }, 200);
        }
    }

    function newRol() {
        _loaderStatus = 0
        descripcionRol = ''
    }
</script>


<div class="p-5" in:fly="{{ x: 200, duration: 200 }}">
    <div class="flex justify-between items-end">
        <div class="w-80">        
            <p class="text-xl font-medium">Roles</p>
            <p class="font-light text-sm text-gray-600">Los roles son actividades que contribuyen a los objetivos de la empresa, como por ejemplo un Cocinero o un Mozo.</p>
        </div>
        <div class="text-right w-40">
            <Button icon="fa fa-arrow-left" color="secondary" on:click={goBack}>Atras</Button>
            <Button icon="fa fa-plus" color="primary" on:click={()=>handleToggleModal()}>Agregar</Button>
        </div>
    </div>
    <br>

    <Grid {data} {columns} language={es_La} sort search/>

    <!-- tabla -->
    <!-- <div class="relative overflow-x-auto shadow-inner sm:rounded-lg border-collapse border border-slate-200">
        <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <th scope="col" class="px-6 py-3">Rol</th>
                <th scope="col" class="px-6 py-3">Miembros</th>
            </thead>
            <tbody>
                <tr class="border-y">
                    <td class="px-6 py-3">Administrador</td>
                    <td class="px-6 py-3">02</td>
                </tr>
                <tr class="border-y">
                    <td class="px-6 py-3">Administrador</td>
                    <td class="px-6 py-3">02</td>
                </tr>
            </tbody>
        </table>
    </div> -->

    <Modal
        title="Nuevo Rol"
        open={showModal}
        on:close={() => handleToggleModal()}
        >
        <svelte:fragment slot="body">
            <div class="p-2">
                <p class="mb-2">Introduce un nombre para el nuevo rol</p>
                <input type="text" class="uppercase" placeholder="Rol" id="txtRol" bind:value={descripcionRol}>                
                <br>
                <Button icon="fa fa-save" color="primary" loader={_loaderStatus} on:click={() => guardarRol()}>Registrar</Button>
            </div>
        </svelte:fragment>
    </Modal>    
</div>