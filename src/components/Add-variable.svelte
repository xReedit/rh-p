<script>
	import { getData, postData, putData } from '$root/services/httpClient.services';
	import { getValueToken } from '$root/services/login.services';
  import { createEventDispatcher, onMount } from 'svelte'
  import { cubicInOut } from 'svelte/easing';
  import { fade, fly } from 'svelte/transition'
	import Button from './Button.svelte';
	import { showToastSwal } from '$root/services/mi.swal';	
	import {IdVariableStorage, ModalVariableSaveSuccess} from '$root/Store';

  export let open = false
  // export let rowItem = {}
  
  let dataTitle = null
  let idtipo_variable = 1

  let titleModal = [
    {titulo: 'Agregar Ingreso', titulo2: 'Suma A:'},
    {titulo: 'Agregar Descuento', titulo2: 'Resta A:'},
    {titulo: 'Agregar Aporte', titulo2: 'Suma A:'}
  ]

  IdVariableStorage.subscribe((id) => {    
    dataTitle = titleModal[id - 1]
    idtipo_variable = id;
  })
  
  
  // let isEditableValor = false
  let listVariables = []
  let idOrg
  let msjIpunt = 'Colocar el porcentaje en números enteros ej: 10'
  let _loaderStatus = 0
  let isNewRegister = false  

  
  export let rowItem = {
    descripcion: '',
    porcentaje: '1',
    fijo: '1',
    valor:'0',
    idtipo_variable: idtipo_variable,
    leyenda: '',
    idvariables_globales: 0   
  }


  const dispatch = createEventDispatcher()  

  onMount(async () => {        
        loadVariablesGloabeles()
  })


  // carga variables globales
  async function loadVariablesGloabeles() {
    idOrg = getValueToken('idorg')
    listVariables = await getData('variables_globales',`byIdOrg/${idOrg}`)
  }

  function changeInputRadio(option) {    
    // isEditableValor = option === 2
    rowItem.porcentaje = option === 1 ? '1':'0'
    rowItem.fijo = option === 2 ? '1':'0'

    msjIpunt = rowItem.fijo === '1' ? 'El importe será editado al agregar a la planilla' : 'Colocar el porcentaje en números enteros ej: 10'    
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    isNewRegister = !rowItem.idvariables;

    // rowItem.porcentaje = isNewRegister  ? '1' : '0' : rowItem.porcentaje
    // rowItem.fijo = isNewRegister ? !isEditableValor || rowItem.porcentaje === '1' ? '0' : '1' : rowItem.fijo
    rowItem.valor = rowItem.valor.toString()
    rowItem.descripcion = rowItem.descripcion.toLocaleUpperCase()
    rowItem.idtipo_variable = parseInt(idtipo_variable.toString())

    if ( !isNewRegister ) {
      delete rowItem.tipo_variable
      delete rowItem.variables_globales
      delete rowItem.valor_afecta
      delete rowItem.afecta_a
    }
    
    const _payload = rowItem;    

    _loaderStatus = 1
    const rpt = isNewRegister ?
                    await postData('variables', 'create', _payload)
                    : await putData('variables', `update/${rowItem.idvariables}`, _payload)

    

    if (rpt.status === 200) {                  
      ModalVariableSaveSuccess.set(true)

      setTimeout(() => {
            _loaderStatus = 2            
            showToastSwal('success','Se guardo correctamente')   
            setTimeout(() => {
              _loaderStatus = 0                            
              dispatch('close')
            },1000)
        }, 1000);
    } else {
      console.error(rpt)

    }    
  }

  
</script>

{#if open}
<div in:fade={{ duration: 180, easing: cubicInOut }} out:fade={{ duration: 100 }} class="modal z-50 fixed w-full h-full top-0 left-0 flex items-center justify-center p-8 lg:p-0" role="dialog" >
    <div class="modal-overlay fixed w-full h-full bg-gray-900 opacity-50"></div>
    <div class="bg-white lg:h-max mx-auto rounded-lg shadow-xl z-50 overflow-y-auto">
      <div class="flex justify-between items-center head bg-gray-100 py-2 px-5 text-normal font-medium">
        {dataTitle.titulo}
        <button class="p-1 bg-gray-300 hover:bg-gray-300 rounded-full ml-4" on:click={() => dispatch('close')}>
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/></svg>
        </button>
      </div>
      <div class="content p-5">
        

        <form on:submit={handleSubmit}>
            <div class="gap-6 mb-6 md:grid-cols-3 hover:auto-cols-min">
                <label>
                  Descripcion:
                  <input 
                    class="uppercase"
                    type="text"
                    name="descripcion"
                    required 
                    bind:value={rowItem.descripcion} />
                </label>

                <fieldset>                  
                    <label>Tipo de valor</label>
                    <legend class="sr-only">Countries</legend>

                    <div class="flex items-center mb-1">
                        <input id="country-option-1" type="radio" name="countries" value="USA" class="w-4 h-4 border-gray-300 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 dark:focus:bg-blue-600 dark:bg-gray-700 dark:border-gray-600" checked = {rowItem.porcentaje === '1'} on:click={() => changeInputRadio(1)}>
                        <label for="country-option-1" class="block ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                        Porcentaje
                        </label>                        
                    </div>

                    <div class="flex items-center mb-1">
                        <input id="country-option-2" type="radio" name="countries" value="Germany" class="w-4 h-4 border-gray-300 focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-600 dark:focus:bg-blue-600 dark:bg-gray-700 dark:border-gray-600" checked = {rowItem.porcentaje === '0'} on:click={() => changeInputRadio(2)}>
                        <label for="country-option-2" class="block ml-2 text-sm font-medium text-gray-900 dark:text-gray-300">
                        Importe Fijo
                        </label>
                    </div>
                </fieldset>

                <label>
                  <!-- {titleValor}: -->
                  <p class="text-sm {rowItem.fijo === '1' ? 'text-red-600': 'text-blue-600'}">{msjIpunt}</p>
                  <input 
                    class="uppercase"
                    type="number"
                    name="descripcion" 
                    disabled="{rowItem.fijo === '1'}"
                    bind:value={rowItem.valor}
                    required />
                </label>                                

                <label>
                {dataTitle.titulo2}
                  <select name="idvariables_globales" bind:value={rowItem.idvariables_globales} required>
                    {#each listVariables as variable}
                        <option value={variable.idvariables_globales}>
                            {variable.descripcion}
                        </option>
                    {/each}
                  </select>
                </label>
            </div>

            <Button icon="fa fa-save" color="primary" loader={_loaderStatus} on:click={() => handleSubmit}>Listo, Guardar</Button>      
        </form>

        

      </div>
    </div>
  </div>
{/if}
