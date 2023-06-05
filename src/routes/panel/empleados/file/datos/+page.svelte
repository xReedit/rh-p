<script lang="ts">
  import Button from '$root/components/Button.svelte'
  import { goto } from "$app/navigation";   
  import { postData, getData, putData, postDataJSON } from '$root/services/httpClient.services'
  import { convertValuesUpperCase } from '$root/services/utils';
  import { fly } from 'svelte/transition'
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { showToastSwal } from '$root/services/mi.swal';
  import {IdColaboradorEdit} from '$root/Store';

  let _loaderStatus = 0
  let id = null;
  let isNewRegister = true;
  let data= {
        "idcolaborador": "",
        "idorg": '',
        "idsede": '',
        "nombres": "",
        "dni": '',
        "sexo": '',
        "correo": '',
        "direccion": '',
        "telefono": '',
        "profesion":'',
        "cuenta": '',
        "f_nac": '',
        "f_ingreso":'',
        "estado":0,
        "nom_banco": '',
        "ciudad": '',
        "provincia": '',
        "apellidos":''
    }    
  

  onMount(async () => {           
    id = $page.url.searchParams.get('id') 
    setStorageIdColaborardor()
    if (id){
      const _data = await getData('colaborador',`byId/${id}`) 
      data = _data ? _data[0] : data
      isNewRegister = false
    }
  })  
  
  
  const handleSubmit = async (event: Event) => {
    event.preventDefault();    
    const form = event.target as HTMLFormElement
    const formData = new FormData(form)
    let _payload = convertValuesUpperCase(Object.fromEntries(formData))      
    
    
    
    _loaderStatus = 1

    const rpt = isNewRegister ?
                    await postDataJSON('colaborador', 'create', _payload)
                    : await putData('colaborador', `update/${id}`, _payload)

    if (rpt.status === 200 || rpt.idcolaborador) {            
      setTimeout(() => {
            // $page.url.searchParams.set('id',rpt.idcolaborador)            
            if (rpt.idcolaborador ) {              
              id = rpt.idcolaborador;
              setStorageIdColaborardor()
            }

            _loaderStatus = 2            
            showToastSwal('success','Se guardo correctamente')   
            setTimeout(() => {_loaderStatus = 0},1000)
        }, 1000);
    } else {
      console.error(rpt)
    }
  };

  function setStorageIdColaborardor() {
  //   if ( id ){
  //     setContext('idcolaborador-edit-context', id)
  // }

    IdColaboradorEdit.set(id)
    localStorage.setItem('sys::id', id);
  }
    
 
</script>

<div class="m-5" in:fly="{{ x: 200, duration: 200 }}">
    <form on:submit={handleSubmit}>
        <div class="grid gap-6 mb-6 md:grid-cols-3 hover:auto-cols-min">
            <!-- datos generales -->
            <div class="card-1">
                <h5 class="title-1">Datos Generales</h5>

                <label>
                  Nombres:
                  <input class="uppercase" type="text" name="nombres" bind:value={data.nombres} required />
                </label>
                
                <label>
                  Apellidos:
                  <input class="uppercase" type="text" name="apellidos" bind:value={data.apellidos} required />
                </label>

                <label>
                  DNI:
                  <input class="uppercase" type="text" name="dni" bind:value={data.dni} required />
                </label>
                
                <label>
                  Teléfono:
                  <input class="uppercase" type="text" name="telefono" bind:value={data.telefono}/>
                </label>
                
                
                <label>
                  Sexo:
                  <select name="sexo" required bind:value={data.sexo}>
                    <option value="">--Escoge--</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>          
                  </select>
                </label>

                <label>
                  Profesión:
                  <input class="uppercase" type="text" name="profesion" bind:value={data.profesion}/>
                </label>
                
                <br>
                <label>
                  Fecha de Nacimiento:
                  <input name="f_nac" type="date" required bind:value={data.f_nac} />
                </label>
            </div>

            <!-- datos adicionales -->
            <div class="card-1">
                <h5 class="title-1">Direccion</h5>
                <label>
                  Direccion:
                  <input class="uppercase" name="direccion" type="text" bind:value={data.direccion} required/>
                </label>

                <label>
                  Ciudad:
                  <input class="uppercase" name="ciudad" bind:value={data.ciudad} type="text" required/>
                </label>

                <label>
                  Provincia:
                  <input class="uppercase" name="provincia" bind:value={data.provincia} type="text"/>
                </label>
            </div>

            <!-- cuenta bancaria -->
            <div class="card-1">
                <h5 class="title-1">Cuenta Bancaria</h5>
                <label>
                  Numero de cuenta:
                  <input type="text" name="cuenta" bind:value={data.cuenta}/>
                </label>

                <label>
                  Entidad Bancaria:
                  <input class="uppercase" type="text" name="nom_banco" bind:value={data.nom_banco}/>
                </label>
                
                <label>
                  <span class="badge primary">Fecha en que comienza a trabajar:</span>
                  <input name="f_nac" type="date" required bind:value={data.f_ingreso} />
                </label>
            </div>

            <div hidden=true>
                <input type="text" name="correo" bind:value={data.correo}/>
                <input type="text" name="f_ingreso" bind:value={data.f_ingreso}/>
            </div>
        </div>
      
      <Button icon="fa fa-save" color="primary" loader={_loaderStatus} on:click={() => handleSubmit}>Guardar</Button>      
    </form>
</div>