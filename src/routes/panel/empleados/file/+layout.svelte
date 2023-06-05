<script lang="ts">
	import { page } from "$app/stores";
	import { debug, onMount } from "svelte/internal";    
    import { goto } from '$app/navigation';
    import {IdColaboradorEdit} from '$root/Store';

    let idColaborador: any;
    let _urlWithId = ''
    let urlDatos = ''
    let urlContratos = ''    
    
    
    onMount(async () => {
        idColaborador = $page.url.searchParams.get('id')         
        _urlWithId = idColaborador ? `?id=${idColaborador}` : ''   

        IdColaboradorEdit.subscribe((id) => {    
            // dataTitle = titleModal[id - 1]
            idColaborador = id;
        })
        
        console.log('idColaborador', idColaborador);

        urlDatos = `./datos${_urlWithId}`
        urlContratos = `./contratos${_urlWithId}`
    })

    const activeTab = (event: Event) => {        
        const listElements = event.target.parentNode.parentNode.querySelectorAll('a')        
        listElements.forEach(e => e.classList.remove('active'));
        event.target.classList.add('active');        
    }

    function goContratos() {
        if ( idColaborador === null ) {
            return
        }
        goto(urlContratos)
    }
</script>

<div class="m-5">
    <div class="tabs-group flex justify-between items-center">        
        <ul>
            <li>                
                <a href={urlDatos}
                    class="active"              
                    aria-selected="true"
                    on:click={activeTab}
                    >
                    <svg aria-hidden="true" class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clip-rule="evenodd"></path></svg>Datos
                </a>
            </li>
            <li>
                <a href='#' on:click={goContratos}>
                    <div class="flex">
                        <svg aria-hidden="true" class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path></svg>Contratos
                    </div>
                </a>
            </li>
            <!-- <li>
                <a href="#" on:click={activeTab}>
                    <svg aria-hidden="true" class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z"></path></svg>Settings
                </a>
            </li>
            <li>
                <a href="#" on:click={activeTab}>
                    <svg aria-hidden="true" class="w-5 h-5 mr-2 text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"></path><path fill-rule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clip-rule="evenodd"></path></svg>Contacts
                </a>
            </li>             -->
        </ul>

        <div>
            <a class="btn btn-secondary" href="../list"><i class="fa fa-arrow-left mr-1"></i> Atras</a>
        </div>
    </div>

    

    <div>
        <slot></slot>        
    </div>
</div>
