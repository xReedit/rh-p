<script lang="ts">
	import { page } from '$app/stores';
	import Modal from '$root/components/Modal.svelte';
	import { getData, postData, putData } from '$root/services/httpClient.services';
	import { getValueToken } from '$root/services/login.services';
	import { onMount } from 'svelte';
    import { fly } from 'svelte/transition'
    import ListVariable from '$root/components/List-Variable.svelte';
	import { paramsSwalAlert, showAlertSwalHtmlDecision } from '$root/services/mi.swal';
	import { formatCurrency, getNomPerido, removeComaNum } from '$root/services/utils';	
	import Preload from '$root/components/Preload.svelte';
	


    let idOrg
    let idColaborador
    let dataColaborador: any = {}
    let dataBoleta: any = {}
    let listIngresos: any = []
    let listDescuentos: any = []
    let listAporte: any = []
    let listVariablesMaster = []
    let listVariablesFilter = []
    let newItemAddList = {}
    let showModal = false
    let _loaderStatus = 0
    let titleModal = 'Agregar Ingreso'
    let arrTotales: any = {}
    let periodo = ''
    let nomPeriodo = '';
    let paramsSwal = paramsSwalAlert;
    let idplanilla_perido = null
    let dataPlanilla_periodo: any = {}
    let observacionesCierre = ''
    let btnEnvioEnabled = false
    let planillaCerrada = false
    let showPrintPdf = false
    let dataSedePrincipal: any = {}
    let isPreloadShow = false

    onMount(async () => {
        idOrg = getValueToken('idorg') 
        idColaborador = $page.url.searchParams.get('id') 
        periodo = $page.url.searchParams.get('periodo') 
        nomPeriodo = getNomPerido(periodo);

        periodo = periodo +'-01' // el primer dia

        isPreloadShow = true
        await getDataSedePrincipal()
        await getDatosBoleta();
        await addRowSueldoBasicoMensual()
        await getListVariables()
        getDatosPlanilla()

        setTimeout(() => {            
            isPreloadShow = false;
        }, 1000);
    })

    async function getDataSedePrincipal() {
        const _data = await getData('sede', `byIdOrg-principal/${idOrg}`)             
        dataSedePrincipal = _data ? _data[0] : null        
    }

    async function getDatosPlanilla() {
        const _data = await getData('planilla',`byIdColaborador/${idColaborador}/${periodo}`)             
        dataPlanilla_periodo = _data ? _data[0] : null
        
        btnEnvioEnabled = false
        idplanilla_perido = null
        if (dataPlanilla_periodo) {
            btnEnvioEnabled = true
            idplanilla_perido = dataPlanilla_periodo.idplanilla_periodo
            observacionesCierre = dataPlanilla_periodo.observaciones            
        }

        planillaCerrada = idplanilla_perido === null ? false : dataPlanilla_periodo.cerrado === '1'
    }

    async function getListVariables() {
        listVariablesMaster = await getData('variables',`all`)                     
    }

    async function getDatosBoleta() {
        if (idColaborador){
            const _data = await getData('planilla',`colaborador-datos/${idColaborador}`)             
            dataColaborador = _data ? _data[0] : null            
            
            dataBoleta = await getData('colaborador-boleta',`byIdColaborador/${idColaborador}/${periodo}`)             
            dataBoleta = dataBoleta ? dataBoleta : []            
                     

            setListCorresponde();
        }
        
    }

    function setListCorresponde() {
        listIngresos = dataBoleta.filter(x => x.idtipo_variable === 1)
        listDescuentos = dataBoleta.filter(x => x.idtipo_variable === 2)
        listAporte = dataBoleta.filter(x => x.idtipo_variable === 3)        
        sumTotales();
    }



    async function addRowSueldoBasicoMensual(_rowAdd: any = {}) {
        // 42 = Sueldo basico mensual
        // let _rowAdd = {}
        const _rowSBM = dataBoleta.find(x => x.idvariables === 42)        
        if ( !_rowSBM ) {            
            _rowAdd = {
                idvariables: 42,
                idcolaborador: parseInt(idColaborador),
                f_add: new Date().toISOString().split('T')[0],
                importe: removeComaNum(dataColaborador.suedo_basico).toString(),
                permanente: '1',
                periodo: periodo
            }
            

            await postData('colaborador-boleta', 'create', _rowAdd)
            // addRowList(_rowAdd, 1)
            getDatosBoleta()

        } else { // si existe comparamos el importe del sueldo sueldo
            if ( _rowSBM.importe !==  dataColaborador.suedo_basico ) {
                _rowAdd = {                                                            
                    importe: dataColaborador.suedo_basico,
                    f_add: new Date().toISOString().split('T')[0]    
                }

                await putData('colaborador-contrato', `update/${_rowSBM.idcolaborador_boleta}`, _rowAdd)
                _rowSBM.importe = dataColaborador.suedo_basico    
            }

            // addRowList(_rowSBM, 1)
        }        


    }

    async function saveRowItem(_rowAdd: any = {}) {
        // const _rowSBM = dataBoleta.find(x => x.idvariables === _rowAdd.idvariables)

        // if ( !_rowSBM ) {  
            _rowAdd = {
                idvariables: _rowAdd.idvariables,
                idcolaborador: parseInt(idColaborador),
                f_add: new Date().toISOString().split('T')[0],
                periodo: periodo,
                importe: _rowAdd.importe_calculado.toString(),
                permanente: _rowAdd.permanente,
                fecha_registro:_rowAdd.fecha_registro,
                observaciones: _rowAdd.observaciones
            }

            await postData('colaborador-boleta', 'create', _rowAdd)        
            getDatosBoleta()
        // } else { // si existe comparamos el importe del sueldo sueldo
        //     if ( _rowSBM.importe !==  _rowAdd.importe_calculado ) {
        //         _rowAdd = { 
        //             periodo: periodo,                                                           
        //             importe: _rowAdd.importe_calculado,
        //             f_add: new Date().toISOString().split('T')[0]    
        //         }

        //         await putData('colaborador-boleta', `update/${_rowSBM.idcolaborador_boleta}`, _rowAdd)
        //         _rowSBM.importe = _rowAdd.importe_calculado 
        //     }            
        // }        
    }

    function addRowList(rowItem: any = {}) {
        // calcular si es porcentaje
        if ( planillaCerrada ) return
        let importe = rowItem.valor
        if (rowItem.porcentaje === '1') {
            importe = parseFloat(rowItem.variables_globales.importe) * (rowItem.valor / 100)
        }

        rowItem.importe_calculado = importe
        saveRowItem(rowItem)
    }

    function processRemove(rowItem) {

        dataBoleta = dataBoleta.filter(x => x.idcolaborador_boleta !== rowItem.idcolaborador_boleta)
        putData('colaborador-boleta', `remove`, rowItem)
        setListCorresponde();
    }

    async function remove(_row) {    
        if ( planillaCerrada ) return            
        let paramsSwal = paramsSwalAlert;    
        paramsSwal.title = 'Eliminar Registro'        
        paramsSwal.content = `Esta seguro de eliminar: <span class="text-yellow-500"><strong>${_row.nom_variable}</strong></span>?`
        const _rptRemove = await showAlertSwalHtmlDecision(paramsSwal)
        if ( _rptRemove.isConfirmed ) {
            processRemove(_row);
        }        
    }

    function openModalAdd(option: number) {
        if ( planillaCerrada ) return
        listVariablesFilter = listVariablesMaster.filter(x => x.idtipo_variable === option)         
        switch (option) {
            case 1: // ingreso
                titleModal = 'Agregar Ingreso'       
                break;        
            case 2: // Descuentos
                titleModal = 'Agregar Descuento'
                break;        
            case 3: // Descuentos
                titleModal = 'Agregar Aporte'
                break;        
        }

        showModal = true        
    }


    function handleToggleModal() {        
        showModal = !showModal
    }

    function getItemList(item) {
        newItemAddList = item.detail.item;        
        handleToggleModal();
        addRowList(newItemAddList)
    }


    function sumTotales() {
        const tt_ingresos = listIngresos.map(x => parseFloat(removeComaNum(x.importe).toString())).reduce((a, b) => a + b, 0)
        const tt_descuentos = listDescuentos.map(x => parseFloat(removeComaNum(x.importe).toString())).reduce((a, b) => a + b, 0)
        const tt_aportes = listAporte.map(x => parseFloat(removeComaNum(x.importe).toString())).reduce((a, b) => a + b, 0)

        arrTotales = {
            total_ingresos: tt_ingresos,
            total_descuentos: tt_descuentos,
            total_aportes: tt_aportes,
            neto_pagar: (tt_ingresos - tt_descuentos).toString()
        }
    }

    // se marca o se cierra la planilla
    // esto hace que el neto pagado figure en la vista principal
    async function checkCerrarPeriodo() {
        // total pagado           
        paramsSwal.title = 'Cerrar Planilla ' 
        paramsSwal.content = `Esta seguro de cerrar el planilla del periodo: <span class="text-yellow-500"><strong>${nomPeriodo}</strong></span> de este colaborador?. Al cerrar periodo se considera pagado la remuneración mensual, también se habilitan los botones de imprimir y enviar por WhastApp la boleta de pago.`
        paramsSwal.confirmButtonText = 'Si, seguro'
        const _rptRemove = await showAlertSwalHtmlDecision(paramsSwal)
        if ( _rptRemove.isConfirmed ) {
            goProcessCerrarPeriodo();
            planillaCerrada = true;
        } 
    }

    async function checkAbrirPeriodo() {
        // total pagado           
        paramsSwal.title = 'Abrir Planilla' 
        paramsSwal.content = `Al abrir planilla podra modificar los registros del periodo: <span class="text-yellow-500"><strong>${nomPeriodo}</strong></span> de este colaborador.`
        paramsSwal.confirmButtonText = 'Listo'
        const _rptRemove = await showAlertSwalHtmlDecision(paramsSwal)
        if ( _rptRemove.isConfirmed ) {
            goProcessCerrarPeriodo('0');
            planillaCerrada = false;
        } 
    }

    async function goProcessCerrarPeriodo(value_cerrar = '1') {
        const _importeAdelantoQuincena = listDescuentos.filter(x => x.nom_variable.toLowerCase().indexOf('adelanto') > -1).map(x => parseFloat(removeComaNum(x.importe).toString())).reduce((a, b) => a + b, 0) || 0
        const _total_pagodo_mes = parseFloat(arrTotales.neto_pagar) + _importeAdelantoQuincena

        const  txt_observaciones = document.getElementById('txt_observaciones').value
        let _payload = {
            idcolaborador: parseInt(idColaborador),
            periodo: periodo,
            observaciones: txt_observaciones,
            total_pagado: _total_pagodo_mes.toString(),
            cerrado: value_cerrar,
            idusuario: getValueToken('id')
        }
        

        const rpt = idplanilla_perido === null ?
                    await postData('planilla', 'create-cierre-periodo', {..._payload})
                    : await putData('planilla',  `update-cierre-periodo/${idplanilla_perido}`, _payload)
        
    }

    function printBoleta() {
        // const _html = document.getElementById('print-boleta').innerHTML
        // imprimirHTML(_html)
        showPrintPdf = true
        setTimeout(() => {                 
            window.print();
        }, 1000);
        setTimeout(() => {
            showPrintPdf = false
        }, 3500);
    }

    
    
</script>
<div class="p-5" in:fly="{{ x: 200, duration: 200 }}">  
    <Preload isLoading = {isPreloadShow}/>
    <div class="pb-5 flex justify-between items-start">    
        <div>
            <h1 class="text-xl">Boleta de Pago</h1>
            {#if planillaCerrada}
                <p hidden={showPrintPdf} class="badge danger">Planilla cerrada, para modificarla primero debe abrirla.</p>
            {/if}
        </div>    
        <div class="flex" hidden={showPrintPdf}>
                     
            <a class="btn btn-secondary" href="./list">
                <i class="fa fa-arrow-left"></i>                
            </a>             
        </div>
    </div>

    
    <div class="mt-2 text-sm" id='print-boleta'>
        <!-- datos del empleador -->
        <div>
            <p><span class="font-bold">Empleador:</span> { dataSedePrincipal.nombre } - {dataSedePrincipal.ruc}</p>        
            <p><span class="font-bold">Periodo:</span> <span class="badge primary font-bold">{nomPeriodo}</span></p>        
        </div>

        <div class="mt-5 grid grid-cols-3">

            <!-- datos del empleado -->
            <div>
                <p>
                    <span class="font-bold">Sr(a):</span>                    
                    {dataColaborador.nombres} {dataColaborador.apellidos}                    
                </p>
                <p>
                    <span class="font-bold">DNI:</span>
                    {dataColaborador.dni}
                </p>
                <p>
                    <span class="font-bold">Cargo:</span>
                    {dataColaborador.cargo}
                </p>
                <p>
                    <span class="font-bold">Area:</span>
                    {dataColaborador.nom_area}
                </p>
                <p>
                    <span class="font-bold">Lugar de Trabajo:</span>
                    {dataColaborador.nom_sede} {dataColaborador.ciudad_sede}
                </p>                
            </div>

            <!-- datos del contrato -->
            <div>
                <p>
                    <span class="font-bold">Tipo Contrato:</span>
                    {dataColaborador.tipo_contrato}
                </p>
                <p>
                    <span class="font-bold">Incio:</span>
                    {dataColaborador.fecha_empieza}
                </p>
                <p>
                    <span class="font-bold">Periodo Renumerecion:</span>
                    {dataColaborador.unidad_remuneracion}
                </p>
                <p>
                    <span class="font-bold">Horas de trabajo:</span>
                    {dataColaborador.horas} hrs
                </p>
                <p>
                    <span class="font-bold">Sueldo Base:</span>
                    {dataColaborador.suedo_basico}
                </p>
            </div>

            <!-- Pension -->
            <div>
                <p>
                    <span class="font-bold">Fondo de pensión:</span>
                    AFP
                </p>
                <p>
                    <span class="font-bold">Salud:</span>
                    Rimac
                </p>
                <p>
                    <span class="font-bold">CUSPP:</span>
                    132132132
                </p>                   
                <p>
                    <span class="font-bold">Entidad Bancaria:</span>
                    {dataColaborador.nom_banco}
                </p>
                <p>
                    <span class="font-bold">Cuenta Bancaria:</span>
                    {dataColaborador.cuenta}
                </p>
            </div>
        </div>


        <!-- remuneracion -->
        <div class="mt-5 grid grid-cols-2">

            <!-- ingresos -->
            <div class="div-list-boleta hmin">
                <div class={showPrintPdf ? 'titulo-print' : 'titulo'}>
                    <div class="flex items-center">
                        <p>INGRESOS</p>
                        <button hidden={showPrintPdf} class="btn btn-sm btn-primary ml-2" on:click={() => openModalAdd(1)}>Agregar</button>
                    </div>
                    <p class="font-semibold">{formatCurrency(arrTotales.total_ingresos) || 0}</p>
                </div>
                <ul >
                    {#each listIngresos as item}                                            
                    <li class="list-item-u">
                        <div class="flex justify-center">
                            <button class="m-0 p-0 btn-remove-item animate__animated animate__fadeInLeft animate__faster"
                                on:click={() => remove(item)}>
                                <i class="fa fa-trash text-red-500"></i>
                            </button>
                            <p class="uppercase transition-all ease-in-out hover:-translate-x-1">{item.nom_variable}</p>
                        </div>                           
                        <div>
                            <p class="text-base font-semibold text-gray-900">{item.importe}</p>
                        </div>                        
                    </li>
                    {/each}
                </ul>
            </div>

            <div>
                
                <!-- descuentos -->
                <div class="div-list-boleta" style="min-height: 200px;">
                    <div class={showPrintPdf ? 'titulo-print' : 'titulo'}>
                        <div class="flex items-center">
                            <p>DESCUENTOS</p>
                            <button hidden={showPrintPdf} class="btn btn-sm btn-primary ml-2" on:click={() => openModalAdd(2)}>Agregar</button>
                        </div>
                        <p class="font-semibold">{formatCurrency(arrTotales.total_descuentos) || 0}</p>
                    </div>
                    <ul >
                        {#each listDescuentos as item}                                            
                        <li class="list-item-u">
                            <div class="flex">
                                <button class="m-0 p-0 btn-remove-item animate__animated animate__fadeInLeft animate__faster"
                                    on:click={() => remove(item)}>
                                    <i class="fa fa-trash text-red-500"></i>
                                </button>
                                <div>
                                    <p class="uppercase transition-all ease-in-out hover:-translate-x-1">{item.nom_variable}</p>
                                    {#if item.fecha_registro} 
                                        <div class="flex">
                                            <p class="text-gray-800 fs-10">{item.fecha_registro}</p>
                                            {#if item.observaciones} 
                                                <p class="text-gray-800 fs-10 ml-1">| {item.observaciones}</p>
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                            </div>                                              
                            <div>
                                <p class="text-base font-semibold text-gray-900">{item.importe}</p>
                            </div>                        
                        </li>
                        {/each}
                    </ul>
                </div>

                <div class="div-list-boleta" style="min-height: 120px;">
                <div class={showPrintPdf ? 'titulo-print' : 'titulo'}>
                       <div class="flex items-center">
                           <p>APORTES</p>
                           <button hidden={showPrintPdf} class="btn btn-sm btn-primary ml-2" on:click={() => openModalAdd(3)}>Agregar</button>
                       </div>
                       <p class="font-semibold">{formatCurrency(arrTotales.total_aportes) || 0}</p>
                </div>
                <ul >
                    {#each listAporte as item}                                            
                    <li class="list-item-u">
                        <div class="flex">
                            <button class="m-0 p-0 btn-remove-item animate__animated animate__fadeInLeft animate__faster"
                                on:click={() => remove(item)}>
                                <i class="fa fa-trash text-red-500"></i>
                            </button>
                            <p class="uppercase transition-all ease-in-out hover:-translate-x-1">{item.nom_variable}</p>
                        </div>                                              
                        <div>
                            <p class="text-base font-semibold text-gray-900">{item.importe}</p>
                        </div>                        
                    </li>
                    {/each}
                </ul>
            </div>

            </div>
        </div>     

        <div class="grid grid-cols-2">
            <div class={showPrintPdf ? 'div-totales-print' : 'div-totales'}>
                TOTAL EN INGRESOS {formatCurrency(arrTotales.total_ingresos)}
            </div>
            <div class={showPrintPdf ? 'div-totales-print' : 'div-totales'}>
                TOTAL EN DESCUENTOS {formatCurrency(arrTotales.total_descuentos)}
            </div>
        </div>
        <div class={showPrintPdf ? 'div-totales-print' : 'div-totales font-bold'}>
            NETO A PAGAR {formatCurrency(arrTotales.neto_pagar)}
        </div>
    </div>


    <div class="flex justify-between items-center" hidden={showPrintPdf}>
        <div class="w-64">
            <textarea name="" id="txt_observaciones" cols="5" rows="3" placeholder="Obervaciones del periodo" bind:value={observacionesCierre}></textarea>
        </div>
        <div>
            {#if planillaCerrada}                
                <button class="btn btn-warning mr-1" on:click={checkAbrirPeriodo}>
                    <i class="fa fa-unlock"></i>
                    Abrir Planilla
                </button>            
            {:else}
              <button class="btn btn-primary mr-1" on:click={checkCerrarPeriodo}>
                <i class="fa fa-lock"></i>
                Cerrar Planilla
            </button>            
            {/if}
            <button class="btn btn-secondary mr-1" disabled={!planillaCerrada} on:click={printBoleta}>
                <i class="fa fa-print"></i>
                Imprimir Boleta de pago
            </button>
            <!-- <button class="btn btn-success mr-1" disabled={!btnEnvioEnabled}>
                <i class="fa fa-whatsapp"></i>
                Enviarlo por WhatsApp
            </button>             -->
        </div>
    </div>












    <Modal
        title={titleModal}
        open={showModal}
        on:close={() => handleToggleModal()}
        >
        <svelte:fragment slot="body">
            <div class="p-2 flex">
                <div class="p-2"> 
                    <ListVariable 
                        items={listVariablesFilter} 
                        on:getItem={(e) => getItemList(e)}/>
                </div>
            </div>
        </svelte:fragment>
    </Modal>  
</div>