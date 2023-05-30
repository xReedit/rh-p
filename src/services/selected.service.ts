// Este servcio trabaja con los comboselect
// verifica si el valor elegido esta en la base de datos
// si no es asi entonces crea y devuelve el id
import { postDataJSON } from "./httpClient.services";
 
export async function getSeletecDataValue (_data, _value, _controller, _event, _labelSearch = 'descripcion') {            
    const _rowInData = searhInData(_data, _labelSearch, _value)
    if ( _rowInData ) {
        return _rowInData;
    } else {
        // sino existe create
        let _payload = {}
        _payload[_labelSearch] = _value.trim().toUpperCase()
            
        const _rpt = await postDataJSON(_controller, _event, _payload)        
        return _rpt
    }

}

function searhInData(_data, _labelSearch, _valueSearch): Object {
    return _data.find(x => x[_labelSearch].trim().toLowerCase() === _valueSearch.trim().toLowerCase())
}