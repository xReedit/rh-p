<script lang="ts">
    import { onMount } from 'svelte';
    import { getValueToken, isLogin } from '$root/services/login.services'    
    import { goto } from "$app/navigation";   
    import { fly } from 'svelte/transition'
    import { postData, getData, putData } from '$root/services/httpClient.services'
    import Button from '$root/components/Button.svelte'
	import Modal from '$root/components/Modal.svelte';
	import { es_La } from '$root/services/es_La';
	import Grid from "gridjs-svelte"  	
	import { convertValuesUpperCase } from '$root/services/utils';
	import { showToastSwal } from '$root/services/mi.swal';
	import { h, html } from 'gridjs';

    let idSede
    let isNewRegister = true
    let showModal = false    
    let _loaderStatus = 0
    let data = []
    let columns = [];
    let sedeSeleted: any = {}
    

    function handleToggleModal() {
        isNewRegister = false;
        showModal = !showModal
    }

    function addSede() {
        isNewRegister = true;
        sedeSeleted = {}
        showModal = true;
    }

    onMount(async () => {        
        isLogin()
        loadData()
    })

    function goBack() {
        goto('./')
    }

    async function loadData() {
        const _idOrg = getValueToken('idorg')
        data = await getData('sede', `byListOrg/${_idOrg}`)

        columns = [
            {
                id: 'idsede',
                hidden: true
            }, {
                id: 'razon_social',
                name: 'Razon Social'
            },
            {
                id: 'nombre',
                name: 'Nombre'
            },
            , {
                id: 'ciudad',
                name: 'Ciudad'
            }, {
                id: 'cantidad',
                name: 'Empleados'
            },
            {
                name: 'Accion',
                formatter: (cell, row) => {
                    return h('button', {
                        className: 'btn btn-sm btn-primary mr-1',
                        onClick: () => editSede(row.cells[0].data)
                    }, html('<i class="fa fa-pencil"></i>'),)
                    
                }
            }         
        ]
    }

    function editSede(id) {
        idSede = id;
        sedeSeleted = data.find(x => x.idsede == idSede)
        isNewRegister = false;
        showModal = true;        
    }
        
    const handleSubmit = async (event: Event) => {
        event.preventDefault();   
        const idsede_restobar = getValueToken('idsede_restobar')

        const form = event.target as HTMLFormElement
        const formData = new FormData(form)
        let _payload = convertValuesUpperCase(Object.fromEntries(formData))        
        _payload.principal = _payload.principal ? '1' : '0'                
        _payload = {..._payload, idsede_restobar: idsede_restobar}


        _loaderStatus = 1

        const rpt = isNewRegister ?
                    await postData('sede', 'create-sucursal', {..._payload})
                    : await putData('sede', `update-sucursal/${idSede}`, _payload)

        if (rpt.status === 200) {            
          setTimeout(() => {
                _loaderStatus = 2            
                showToastSwal('success','Se guardo correctamente')   
                setTimeout(() => {
                    _loaderStatus = 0
                    loadData()
                    showModal = false
                },1000)
            }, 1000);
        } else {
          _loaderStatus = 0
          console.error(rpt)
        }

        
      }

    
      
</script>


<div class="p-5" in:fly="{{ x: 200, duration: 200 }}">
    <div class="flex justify-between items-end">
        <div class="w-80">        
            <p class="text-xl font-medium">Centro de Trabajo</p>
            <p class="font-light text-sm text-gray-600">Lugar, ciudad o sucursal de trabajo.</p>
        </div>
        <div class="text-right w-40">
            <Button icon="fa fa-arrow-left" color="secondary" on:click={goBack}>Atras</Button>
            <Button icon="fa fa-plus" color="primary" on:click={()=>addSede()}>Agregar</Button>
        </div>
    </div>
    <br>

    <Grid {data} {columns} language={es_La} sort search/>

    <Modal
        title="Nuevo Sucursal"
        open={showModal}
        on:close={() => handleToggleModal()}
        >
        <svelte:fragment slot="body">
            <form on:submit={handleSubmit}>
            <div class="p-2 flex">
                <div class="p-2">
                    <p>Numero RUC</p>
                    <input type="text" class="uppercase" placeholder="Ruc" name="ruc"  bind:value={sedeSeleted.ruc}>
                    <p>Razon Social</p>
                    <input type="text" class="uppercase" placeholder="Razon Social" name="razon_social" bind:value={sedeSeleted.razon_social}>
                    <p>Nombre</p>
                    <input type="text" class="uppercase" placeholder="Nombre" name="nombre" bind:value={sedeSeleted.nombre}>                
                </div>
                <div class="p-2">
                    <p>Ciudad</p>
                    <input type="text" class="uppercase" placeholder="Ciudad" name="ciudad" bind:value={sedeSeleted.ciudad}>                
                    <p>Direccion</p>
                    <input type="text" class="uppercase" placeholder="Direccion" name="direccion" bind:value={sedeSeleted.direccion}>                
                    <p>Telefono</p>
                    <input type="text" class="uppercase" placeholder="Telefono" name="telefono" bind:value={sedeSeleted.telefono}>                
                </div>
            </div>

            <div class="flex items-center pl-5">
                <input class="checkbox-1 mr-1 cursor-pointer check-dia" type="checkbox" name="principal" id="principal" value={sedeSeleted.principal} checked={sedeSeleted.principal === '1'}>
                <label for="principal">Principal, con esta razón social se emitirán las<br> boletas de pago</label>
            </div>
            <br>

            <div class="pl-2">
                <Button icon="fa fa-save" color="primary" loader={_loaderStatus} on:click={() => handleSubmit}>Registrar</Button>
            </div>
            </form>
        </svelte:fragment>
    </Modal>    
</div>