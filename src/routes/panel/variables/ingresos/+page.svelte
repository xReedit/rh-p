<script lang="ts">
	import Grid from "gridjs-svelte"
	import { getData, postData, postDataJSON, putData } from '$root/services/httpClient.services';
	import { getValueToken, verifyLogin } from '$root/services/login.services';
	import { onMount } from 'svelte';
    import { fly } from 'svelte/transition'
	import { es_La } from "$root/services/es_La";
	import { ModalVariableSaveSuccess } from "$root/Store";
	import { h, html } from "gridjs";
	import AddVariable from "$root/components/Add-variable.svelte";
	import { paramsSwalAlert, showAlertSwalHtmlDecision, showAlertSwalOk } from "$root/services/mi.swal";


    let idtipo_variable = 1 // ingreso
    let data: any = []
    let columns: any = []
    let rowItem = {}
    let showModal = false

    let paramsSwal = paramsSwalAlert;

    onMount(async () => {        
        loadData()
    })

    ModalVariableSaveSuccess.subscribe((data) => {        
        if ( data === true ) {
            ModalVariableSaveSuccess.set(false)
            loadData()
        }
    })

    async function loadData() {        
        const _payload = {
            idorg: getValueToken('idorg') 
        }    
                
        data = await postDataJSON('variables',`byIdTipoVariable/${idtipo_variable}`, _payload)
        // data = _data ? _data[0] : data        
        data = data.map(x => {
            x.valor_afecta = x.porcentaje === '1' ?  `${x.valor}%` : 'Editable'
            x.afecta_a = x.variables_globales.descripcion
            return x;
        })


        columns = [
            {
                id: 'idvariables',
                hidden: true
            },
            {
                id: 'descripcion',
                name: 'Descripcion'
            },
            {
                id: 'valor_afecta',
                name: 'Valor'
            },
            {
                id: 'afecta_a',
                name: 'Suma de'
            },
            {
                name: 'Accion',
                formatter: (cell, row) => {
                    return [h('button', {
                        className: 'btn btn-sm btn-primary mr-1',
                        onClick: () => edit(row.cells[0].data)
                    }, html('<i class="fa fa-pencil"></i>'),) , h('button', {
                        className: 'btn btn-sm btn-danger',
                        onClick: () => remove(row.cells[0].data)
                    }, html('<i class="fa fa-trash"></i>'),)]
                    
                }
            }
        ]
    }        


    function edit(id) {
        // rowItemSeleted        
        const _row = getItemList(id)
        rowItem = _row
        showModal = true;
    }

    async function remove(id) {
        const _row = getItemList(id)        
        paramsSwal.title = 'Eliminar Registro'        
        paramsSwal.content = `Esta seguro de eliminar: <span class="text-yellow-500"><strong>${_row.descripcion}</strong></span>?`
        const _rptRemove = await showAlertSwalHtmlDecision(paramsSwal)
        if ( _rptRemove.isConfirmed ) {
            processRemove(id);
        }        
    }

    function processRemove(id) {
        data = data.filter(x => x.idvariables !== id)
        putData('variables', `removeById/${id}`)
    }

    function getItemList(id: number): any {
        return data.filter(x => x.idvariables === id)[0]
    }

    function handleToggleModal() {
        showModal = !showModal
    }
</script>


<div class="m-5" in:fly="{{ x: 200, duration: 200 }}">
    <Grid {data} {columns} language={es_La} sort/>
    
    <AddVariable
        idtipo_variable=1
        open={showModal} 
        {rowItem}
        on:close={() => handleToggleModal()}       
        >
    </AddVariable>
</div>