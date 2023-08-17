<script lang="ts">
	import { onMount } from "svelte";
    import Grid from "gridjs-svelte"  
    import { h, html, Row } from "gridjs";
    import { es_La } from '$root/services/es_La';
	import { getValueToken } from "$root/services/login.services";
	import { getData } from "$root/services/httpClient.services";
	import { fly } from "svelte/transition";
	import { exportTableToExcel, formatCurrency, removeComaNum } from "$root/services/utils";
	import { goto } from "$app/navigation";

        
    let keyStoragePeriodo = 'sys::periodo'
    let data: any = []
    let columns: any = []
    let dataResumen = {
        total: 0,
        total_pagado: 0,
        mujeres: 0,
        hombres: 0,        
    }

    let dateNowPeriodo = ''
    

    const pagination = {
        limit: 10
    }

    onMount(async () => {                
        getPeriodoSelected()
    })

    function getPeriodoSelected() {
        const _periodoStorage = localStorage.getItem(keyStoragePeriodo)
        if ( !_periodoStorage ) {
            const _dateNow = new Date()
            dateNowPeriodo = _dateNow.getFullYear() + '-' + _dateNow.getMonth().toString().padStart(2, '0')
            localStorage.setItem(keyStoragePeriodo, dateNowPeriodo)
        } else {
            dateNowPeriodo = _periodoStorage
        }

        getAll()
    }

    const getAll = async () => {
        const _idOrg = getValueToken('idorg')  
        const _perido = dateNowPeriodo + '-01' // primer dia
        data = await getData('planilla', `byIdorg/${_idOrg}/${_perido}`)        
   
        // cocinar data 
        data.map(x => {
            x.total_ingresos = x.total_ingresos ? x.total_ingresos : 0
            x.total_descuentos = x.total_descuentos ? x.total_descuentos : 0
            x.total_aportes = x.total_aportes ? x.total_aportes : 0
            x.totales.map(i => {
                const _importe = isNaN(parseFloat(i.importe)) ? 0 : parseFloat(i.importe)
                switch (i.tipo) {
                    case 1:                        
                        x.total_ingresos += _importe
                        break;
                    case 2:                        
                        x.total_descuentos += _importe
                        break;
                    case 3:                        
                        x.total_aportes += _importe
                        break;                    
                }                
            })         
            
            // neto a pagar
            x.neto_pagar = x.total_ingresos - x.total_descuentos
            return x
        })

    //  columns = [
    //         {
    //             id: 'idcolaborador',
    //             hidden: true
    //         },
    //         {
    //             data: (row:any) => row.nom_sede + ' ' + row.ciudad_sede,
    //             name: 'Lugar de Trabajo'
    //         }, {
    //             data: (row:any) => row.nombres + ' ' + row.apellidos,
    //             name: 'Nombres',
    //         }, {
    //             id: 'rol',
    //             name: 'Cargo'
    //         }, {
    //             id: 'unidad_remuneracion',
    //             name: 'Periodo'
    //         }, {
    //             id: 'importe_remuneracion',
    //             name: 'Sueldo Básico'
    //         },
    //         {
    //             id: 'total_pagado',
    //             name: 'Total Pagado',
    //             formatter: (cell) => {                    
    //                 if ( cell === '0.00') {
    //                     return html(`<p><i title="cerrado" class="fa fa-unlock text-gray-500"></i></p>`)
    //                 } else {
    //                     return html(`<b>${cell} <i class="fa fa-lock text-green-500"></i></b>`)
    //                 }
    //             }
    //         },
    //         {
    //             name: '',
    //             formatter: (cell, row) => {
    //                 return h('button', {
    //                     className: 'btn btn-sm btn-primary mr-1',
    //                     onClick: () => edit(row.cells[0].data)
    //                 }, html('<i class="fa fa-list-alt" title="Boleta de Pago"></i>'),)
                    
    //             }
    //         }
    //     ]

        resumenColaboradores()
    }

    function edit(item) {      
        const id = item.idcolaborador          
        const _url = `./boleta-pago?id=${id}&periodo=${dateNowPeriodo}`
        goto(_url)         
    }

    
    function resumenColaboradores() {
        dataResumen.total = data.map(x => removeComaNum(x.importe_remuneracion)).reduce((a, b) => a + b,0)
        dataResumen.total_pagado = data.map(x => removeComaNum(x.total_pagado)).reduce((a, b) => a + b,0)
        dataResumen.mujeres = data.filter(x => x.sexo==='F').length
        dataResumen.hombres = data.filter(x => x.sexo==='M').length        
    }

    function changeDatePeriodo() {        
        localStorage.setItem(keyStoragePeriodo, dateNowPeriodo)
        getPeriodoSelected();
    }

    function descargarTablaExcel() {
        exportTableToExcel('tabla-planilla-excel', `planilla-${dateNowPeriodo}`)
    }

</script>
<div class="p-5" in:fly="{{ x: 200, duration: 200 }}">
    <div class="flex justify-between items-end">
        <div class="w-90">        
            <p class="text-xl font-medium">Planilla</p>            
            <p class="font-light text-sm text-gray-600"><span class="badge primary"> Lista de colaboradores que tienen un contrato, en el periodo seleccionado.</span></p>
            
            <div class="w-40 mt-2">
                <label class="font-light text-sm text-gray-600" for="month-periodo">Seleccione Periodo:</label>
                <input type="month" id="month-periodo" bind:value={dateNowPeriodo} on:change={changeDatePeriodo}>
            </div>
        </div>
        <div class="flex flex-wrap justify-end text-right">
            <div class="flex">
                <button class="btn btn-success mr-1" on:click={() => descargarTablaExcel()}><i class="fa fa-table"></i> Descargar</button>
                <a class="btn btn-secondary" href="../">
                    <i class="fa fa-arrow-left mr-1"></i>
                    Atras
                </a>                                
            </div>
        </div>
    </div>
</div>
<hr>
<div class="p-5" in:fly="{{ x: 200, duration: 200 }}">  

    <table class="fs-12" id="tabla-planilla">
        <thead>
            <tr>
                <th>Lugar de Trabajo</th>
                <th>Nombres</th>            
                <th align="right">Suledo Básico</th>
                <th align="right">Ingresos</th>
                <th align="right">Descuentos</th>
                <th align="right">Aportes</th>
                <th align="right">Neto Pagar</th>            
            </tr>
        </thead>
        <tbody>
            {#each data as item}
                <tr>
                    <td>
                        <p>
                            {item.nom_sede}
                        </p>
                        <p class="fs-10 fw-600">{item.ciudad_sede}</p>
                    </td>
                    <td>
                        <p>
                            {item.nombres} {item.apellidos}
                        </p>
                        <p class="fs-10 fw-600">{item.rol}</p>
                    </td>                    
                    <td align="right">{item.importe_remuneracion}</td>
                    <td align="right">
                        <span class="text-green-600 fw-600">{formatCurrency(item.total_ingresos)}</span>
                    </td>
                    <td align="right">
                        {#if item.total_descuentos > 0}
                        <span class="text-red-600 fw-600">{formatCurrency(item.total_descuentos)}</span>
                        {/if}
                    </td>
                    <td align="right">
                        {#if item.total_aportes > 0}
                        <span class="text-blue-600 fw-600">{formatCurrency(item.total_aportes)}</span>
                        {/if}
                    </td>                    
                    <td>
                        <div class="flex justify-end">
                            <p class="fw-600 text-black">
                                {formatCurrency(item.neto_pagar)}
                            </p>
                            <button class="ml-2 btn btn-sm btn-primary" 
                                on:click={() => edit(item)}
                                title="Boleta de Pago"><i class="fa fa-list-alt" title="Boleta de Pago"></i></button>
                        </div>

                    </td>                    
                    <!-- <td>{formatCurrency(item.importe_remuneracion - item.total_pagado)}</td> -->
                </tr>
            {/each}
        </tbody>
    </table>

    <table class="fs-12" id="tabla-planilla-excel" style="display: none;">
        <thead>
            <tr>
                <th>Lugar de Trabajo</th>
                <th>Ciudad</th>
                <th>Nombres</th>            
                <th>Cargo</th>            
                <th align="right">Suledo Básico</th>
                <th align="right">Ingresos</th>
                <th align="right">Descuentos</th>
                <th align="right">Aportes</th>
                <th align="right">Neto Pagar</th>            
            </tr>
        </thead>
        <tbody>
            {#each data as item}
                <tr>
                    <td>
                        {item.nom_sede}
                    </td>
                    <td>
                        {item.ciudad_sede}
                    </td>
                    <td>                        
                        {item.nombres} {item.apellidos}                                                
                    </td>
                    <td>
                        {item.rol}
                    </td>                    
                    <td align="right">{item.importe_remuneracion}</td>
                    <td align="right">
                        <span class="text-green-600 fw-600">{item.total_ingresos}</span>
                    </td>
                    <td align="right">
                        {#if item.total_descuentos > 0}
                        <span class="text-red-600 fw-600">{item.total_descuentos}</span>
                        {/if}
                    </td>
                    <td align="right">
                        {#if item.total_aportes > 0}
                        <span class="text-blue-600 fw-600">{item.total_aportes}</span>
                        {/if}
                    </td>                    
                    <td>                        
                            <p class="fw-600 text-black">
                                {item.neto_pagar}
                            </p>                                                    
                    </td>                    
                    <!-- <td>{formatCurrency(item.importe_remuneracion - item.total_pagado)}</td> -->
                </tr>
            {/each}
        </tbody>
    </table>

    <!-- <Grid {data} {columns} {pagination} language={es_La} sort search/> -->
    
    <br>    
    <table style="width: 350px;">
        <tr>
            <td>Remuneración Básica Mensual</td>
            <td align="center">{formatCurrency(dataResumen.total.toString())}</td>
        </tr>
        <tr>
            <td>Total Pagado Mensual</td>
            <td align="center">{formatCurrency(dataResumen.total_pagado.toString())}</td>
        </tr>
        <tr>
            <td>Mujeres</td>
            <td align="center">{dataResumen.mujeres}</td>
        </tr>
        <tr>
            <td>Varones</td>
            <td align="center">{dataResumen.hombres}</td>
        </tr>
    </table>
</div>