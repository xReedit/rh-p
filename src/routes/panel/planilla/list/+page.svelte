<script lang="ts">
	import { onMount } from "svelte";
    import Grid from "gridjs-svelte"  
    import { h, html, Row } from "gridjs";
    import { es_La } from '$root/services/es_La';
	import { getValueToken } from "$root/services/login.services";
	import { getData } from "$root/services/httpClient.services";
	import { fly } from "svelte/transition";
	import { formatCurrency, removeComaNum } from "$root/services/utils";
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
                id: 'rol',
                name: 'Cargo'
            }, {
                id: 'unidad_remuneracion',
                name: 'Periodo'
            }, {
                id: 'importe_remuneracion',
                name: 'Sueldo Básico'
            },
            {
                id: 'total_pagado',
                name: 'Total Pagado',
                formatter: (cell) => {                    
                    if ( cell === '0.00') {
                        return html(`<p><i title="cerrado" class="fa fa-unlock text-gray-500"></i></p>`)
                    } else {
                        return html(`<b>${cell} <i class="fa fa-lock text-green-500"></i></b>`)
                    }
                }
            },
            {
                name: '',
                formatter: (cell, row) => {
                    return h('button', {
                        className: 'btn btn-sm btn-primary mr-1',
                        onClick: () => edit(row.cells[0].data)
                    }, html('<i class="fa fa-list-alt" title="Boleta de Pago"></i>'),)
                    
                }
            }
        ]

        resumenColaboradores()
    }

    function edit(id) {                
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
                <!-- <button class="btn btn-success mr-1">Cerrar Periodo</button> -->
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
    <Grid {data} {columns} {pagination} language={es_La} sort search/>
    
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