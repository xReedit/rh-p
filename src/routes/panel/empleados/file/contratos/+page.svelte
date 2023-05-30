<script lang="ts">
  import img from '$root/static/images/paper1.png';	
  import { postData, getData, putData } from '$root/services/httpClient.services'
	import { onMount } from 'svelte';
	import { getValueToken, verifyLogin } from '$root/services/login.services';
	import { fly } from 'svelte/transition'
	import { page } from '$app/stores';
	import { convertValuesUpperCase } from '$root/services/utils';
	import Button from '$root/components/Button.svelte';
	import { showToastSwal } from '$root/services/mi.swal';
  import AutoComplete from "simple-svelte-autocomplete"
	import { getSeletecDataValue } from '$root/services/selected.service';
	

    let dias_semana = [{'id': 1, 'nombre': 'Lunes'},{'id': 2, 'nombre': 'Martes'},{'id': 3, 'nombre': 'Miércoles'},{'id': 4, 'nombre': 'Jueves'},{'id': 5, 'nombre': 'Viernes'},{'id': 6, 'nombre': 'Sábado'},{'id': 7, 'nombre': 'Domingo'}]
    let hora_periodo = [{'id': 1, 'nombre':'DIA'},{'id': 2, 'nombre':'SEMANA'},{'id': 3, 'nombre':'MES'},{'id': 4, 'nombre':'AÑO'}]    
    let idOrg;
    let idSede;
    let listLocal = []
    let listRol = []
    let listAra = []
    let listTipoContrato = []
    let listContratos = []
    let idColaborador;
    let idContrato;
    let _loaderStatus = 0
    let diasTrabaja = '';
    let isNewRegister = true;
    let showBtnAdd = false
    let contratoSelected: any = {};
    let detalleContratoSelected: any = {};
    let listapp = []
    let selectedRol = {}
    let selectedSedeTrabajo = {}
    let selectedEquipo = {}
    let selectedUnidad = {}

    onMount(async () => {        
        idOrg = getValueToken('idorg')        
        idSede = getValueToken('idsede')
        listLocal = await getData('sede',`byIdorg/${idOrg}`)        
        listRol = await getData('rol',`byIdsede/${idSede}`)   
        listAra = await getData('area',`byIdsede/${idSede}`)
        listTipoContrato = await getData('tipo-contrato','all')
        getContratos();             
    })

    function checkDiaList() {
        diasTrabaja='';
        let listCheckDia = document.querySelectorAll('#checkdia')
        listCheckDia.forEach((e:HTMLFormElement) => diasTrabaja += e.checked ? `${e.value},` : '');                
    }


    async function getContratos() {
      idColaborador = $page.url.searchParams.get('id')
      listContratos = await getData('colaborador-contrato',`byIdColaborador/${idColaborador}`)      


      if ( listContratos.length === 0 ) {
        showBtnAdd = false
        newContrato();
      } else {        
        contratoSelected  = listContratos[listContratos.length-1];
        contratoSelected.activo = '1'
        loadContratoSelected(contratoSelected);
      }

      
    }

    function loadContratoSelected(item) {   
      
      listContratos.map(c => {
        // c.activo = 0
        c.selected = false
      })

      listContratos = listContratos;

      contratoSelected = item;
      contratoSelected.selected = true;
      detalleContratoSelected = contratoSelected.colaborador_contrato_detalle ? contratoSelected.colaborador_contrato_detalle[0] : detalleContratoSelected      
      // contratoSelected.activo = 1;
      showBtnAdd = true
      idContrato = contratoSelected.idcolaborador_contrato

      checkDias();            
      isNewRegister = false
            
      selectedRol = listRol.filter(x => x.idrrhh_rol === detalleContratoSelected.idrrhh_rol)[0] || {}
      // selectedSedeTrabajo = listLocal.filter(x => x.idsede === detalleContratoSelected.idsede_trabajo)[0] || {}      
      selectedEquipo = listAra.filter(x => x.idarea === detalleContratoSelected.idarea)[0] || {}      
      
    }

    function checkDias() {
      // dias      
      let listCheckDia = document.querySelectorAll('#checkdia')
      listCheckDia.forEach((e:HTMLFormElement) => e.checked = false)
      
      if ( !detalleContratoSelected ) {
        listCheckDia.forEach((e:HTMLFormElement) => { e.checked = false } )
        return
      }

      const listDias = detalleContratoSelected.dias.split(',')
      listDias.forEach(idDia => {        
        listCheckDia.forEach((e:HTMLFormElement) => {          
          if (!e.checked) {
            e.checked = e.value.toString() == idDia.toString()
          }
        } ); 
      });
    }

    function newContrato(){
      const newContrato = {
        fecha_registro: new Date().toLocaleDateString(),
        activo: '1',
        selected: true
      }

      contratoSelected = {
        "idcolaborador_contrato": null,
        "idcolaborador": null,
        "fecha_registro": "",
        "fecha_empieza": "",
        "estado": "0",
        "activo": 1,
        "idorg": null
      }
      detalleContratoSelected = {
        "idcolaborador_contrato_detalle": null,
        "idcolaborador_contrato": null,
        "idsede_trabajo": null,
        "idrrhh_rol": null,
        "horas": "8",
        "unidad_horas": "DIA",
        "dias": "8",
        "unidad_remuneracion": "SEMANAL",
        "importe": "",
        "estado": "0",
        "idarea": null,
        "idtipo_contrato": null
    }

      listContratos.map(c => {
        c.activo = '0'
        c.selected = false
      })

      checkDias();

      listContratos = [...listContratos, newContrato]            
    }    

    function addNewContrato(){      
      newContrato();
      isNewRegister = true
    }

    const handleSubmit = async (event: Event) => {
        event.preventDefault();   
        const form = event.target as HTMLFormElement
        const formData = new FormData(form)
        let _payload = convertValuesUpperCase(Object.fromEntries(formData))        
        
        

        _loaderStatus = 1

        // COMBOS
        let _value = document.getElementById('comboEquipo').value
        const _rptEquipo = await getSeletecDataValue(listAra,_value,'area', 'create')        
        selectedEquipo = _rptEquipo;
        detalleContratoSelected.idarea = _rptEquipo.idarea

        _value = document.getElementById('comboRol').value
        const _rptRol = await getSeletecDataValue(listRol,_value,'rol', 'create')        
        selectedRol = _rptRol;        
        detalleContratoSelected.idrrhh_rol = _rptRol.idrrhh_rol

        checkDiaList();
        ///

        // update
        if ( !isNewRegister ) {
          let _contrato = {...contratoSelected}
          delete _contrato.colaborador_contrato_detalle
          delete _contrato.selected

          detalleContratoSelected.dias = diasTrabaja

          _payload = {
            contrato: _contrato,
            detalle: detalleContratoSelected
          }
        } else {
          // si es nuevo

          delete detalleContratoSelected.idcolaborador_contrato
          delete detalleContratoSelected.idcolaborador_contrato_detalle

          _payload = {..._payload,
                    idcolaborador: idColaborador,
                    dias: diasTrabaja,
                    ...detalleContratoSelected
                  }
          
        }

        const rpt = isNewRegister ?
                    await postData('colaborador-contrato', 'create', _payload)
                    : await putData('colaborador-contrato', `update/${idContrato}`, _payload)

        if (rpt.status === 200) {            
          setTimeout(() => {
                _loaderStatus = 2            
                showToastSwal('success','Se guardo correctamente')   
                setTimeout(() => {_loaderStatus = 0},1000)
            }, 1000);
        } else {
          _loaderStatus = 0
          console.error(rpt)
        }

        
      }


</script>

<div class="m-5" in:fly="{{ x: 200, duration: 200 }}">
    
    <!-- lista de contratos -->
    <div class="flex items-center">
      {#each listContratos as item }
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="div-contract {item.activo == '0' ? 'desactivated' : ''} {item.selected ? 'selected' : ''}" on:click={() => loadContratoSelected(item)}>
            <p class="date-title">{item.fecha_registro}</p>
            <img src={img} alt="">
            <p class="date-title now-market" hidden={item.activo == 0}>Actual</p>
        </div>      
      {/each}

      <button hidden={!showBtnAdd} class="btn btn-primary" on:click={() => addNewContrato()}> <i class="fa fa-plus"></i></button>
    </div>
    
    <br>
    <hr>
    <!-- detalle -->
    <div class="mt-5">        
    <form on:submit={handleSubmit}>
        <div class="grid gap-6 mb-6 md:grid-cols-3 hover:auto-cols-min">
            <!-- datos generales -->
            <div class="card-1">
                <h5 class="title-1">Información Básica</h5>

                <label>
                  Lugar de trabajo:
                  <select name="idsede_trabajo" bind:value={detalleContratoSelected.idsede_trabajo} required>
                    {#each listLocal as local}
                        <option value="{local.idsede}">
                            {local.nombre} - {local.ciudad}                            
                        </option>
                    {/each}
                  </select>
                </label>      

                <!-- <label>
                  Cargo: -->
                  <!-- <select name="idrrhh_rol" required bind:value={detalleContratoSelected.idrrhh_rol} >
                    {#each listRol as rol}
                        <option value={rol.idrrhh_rol}>
                            {rol.descripcion}
                        </option>
                    {/each}
                  </select> -->
                <!-- </label> -->
                <p class="p-label mt-2">Cargo:</p>
                <AutoComplete  
                  className="w-full mb-2"
                  id="comboRol"
                  items={listRol}              
                  bind:value={detalleContratoSelected.idrrhh_rol}     
                  bind:selectedItem={selectedRol}
                  labelFieldName="descripcion"
                  valueFieldName="idrrhh_rol"
                  noResultsText="Sin Resultados"                  
                  required={true}
                />                



                <!-- <label>
                  Equipo:
                  <select name="idarea" bind:value={detalleContratoSelected.idarea} required>
                    {#each listAra as area}
                        <option value={area.idarea}>
                            {area.descripcion}
                        </option>
                    {/each}
                  </select>
                </label> -->

                <p class="p-label mt-1">Equipo:</p>
                <AutoComplete 
                  className="w-full mb-2"
                  id="comboEquipo"
                  items={listAra}              
                  bind:value={detalleContratoSelected.idarea}     
                  bind:selectedItem={selectedEquipo}                          
                  labelFieldName="descripcion"
                  valueFieldName="idarea"
                  noResultsText="Sin Resultados"
                  required={true}
                />                

                <label>
                  Fecha de incio:
                  <input name="fecha_empieza" type="date" bind:value={contratoSelected.fecha_empieza} required />
                </label>
            </div>

            <div class="card-1">
                <h5 class="title-1">Contrato</h5>              

                <label>
                  Tipo de contrato:
                  <select name="idtipo_contrato" bind:value={detalleContratoSelected.idtipo_contrato} required>
                    {#each listTipoContrato as item}
                        <option value={item.idtipo_contrato}>
                            {item.descripcion}
                        </option>
                    {/each}
                  </select>
                </label>

                <label>
                  Horas:
                  <input class="uppercase" type="text" name="horas" bind:value={detalleContratoSelected.horas} required />
                </label>

                

                <label>
                  Unidad:
                  <select name="unidad_horas"  bind:value={detalleContratoSelected.unidad_horas} required>   
                    {#each hora_periodo as p }
                        <option value="{p.nombre}">{p.nombre}</option>                        
                    {/each}                    
                  </select>
                </label>

                <div>
                    <br>
                    Dias
                    
                    {#each dias_semana as dia}    
                      <div class="flex items-center mr-4">
                          <input class="checkbox-1 mr-1 cursor-pointer check-dia" id="checkdia" type="checkbox" on:change={checkDiaList} value="{dia.id}">  
                          <label for="{dia.nombre}">{dia.nombre}</label>
                      </div>
                    {/each}
                    <input hidden type="text" name="dias"  bind:value={detalleContratoSelected.horas}/>

                    
                </div>
            </div>

            <div class="card-1">
                <h5 class="title-1">Remuneración</h5>              

                <label>
                  Tipo:
                  <select name="unidad_remuneracion" bind:value={detalleContratoSelected.unidad_remuneracion} required>
                    <option value="">--Escoge--</option>
                    <option value="DIARIO">Diario</option>
                    <option value="SEMANAL">Semanal</option>
                    <option value="QUINCENAL">Quincenal</option>
                    <option value="MENSUAL">Mensual</option>
                  </select>
                </label>

                <div class="mt-2">
                  <label>
                    <span class="font-bold badge warning">Sueldo Básico Mensual:</span>
                    <input class="uppercase" type="text" name="importe" bind:value={detalleContratoSelected.importe} required />
                  </label>
                </div>
            </div>
        </div>        
        <Button icon="fa fa-save" color="primary" loader={_loaderStatus} on:click={() => handleSubmit}>Guardar</Button>      

      </form>
    </div>

</div>