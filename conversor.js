var fs = require('fs')
const { error } = require('console')
const {performance} = require('perf_hooks')

module.exports = {
    check: function(schema){
        try{
            schema = JSON.parse(schema)

            return {text:'Valid JSON Schema',shacl:this.start(schema)}
        } catch {
            if(err == 'SyntaxError: Unexpected token o in JSON at position 1'){
                return {text:"Valid JSON Schema!",shacl:this.start(schema)}
            }
            return {text:"Invalid JSON Schema!",shacl:''}
        }
    },
    start: function(schema){
        var JS4GeoDataTypes = {'Point':'Point','LineString':'LineString','Polygon':'Polygon','MultiPoint':'MultiPoint','MultiLineString':'MultiLineString','GeometryCollection':'GeometryCollection'}
        var dataTypes = {"string":"string","integer":"integer","boolean":"boolean","null":"null","number":"decimal",
        "Binary":"base64Binary","Date":"date","Decimal128":"precisionDecimal","Double":"double","Int32":"int","Int64":"long","ObjectId":"ID","Regular Expression":"string + pattern","TimeStamp":"dateTimeStamp","String":"string","Datetime":"dateTime","Long":"long","Boolean":"boolean",
        'Point':'Point','LineString':'LineString','Polygon':'Polygon','MultiPoint':'MultiPoint','MultiLineString':'MultiLineString','GeometryCollection':'GeometryCollection'}
        var constraints = {"maximun":"maxInclusive","exclusiveMaximum":"maxExclusive","minimum":"minInclusive","exclusiveMinimum":"minExclusive","minLength":"minLength","maxLength":"maxLength","pattern":"pattern","enum":"in","const":"in",
        "default_":"defaultValue","title":"name","description":"description"}
        var anotherConstraints = {"allOf":"and","anyOf":"or","oneOf":"xone"}
        var jsonReservedWords = {"properties":true,"definitions":true,"items":true,"required":true,"$ref":true,"type":true}
        var prefix = {"dash":"@prefix dash: <http://datashapes.org/dash#> .","rdf":"@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .","rdfs":"@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .","ex":"@prefix ex: <http://example.org/> .","sh":"@prefix sh: <http://www.w3.org/ns/shacl#> .","xsd":"@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .","sf":"@prefix sf:   <http://www.opengis.net/ont/sf#> ."}


        var scope = 1
        var addPrefixes = {}
        var nodesReady = {}
        var newNodes = {}
        var number = 0
        var elementsUndefined = []
        var log = ''
        var t0
        var t1

        var shacl = ''
        var mappedDatatypes = []
        var defSectionElements
        var schemaSectionElements

        function getDefSectionElements(element){
            if(element.definitions){
                return element.definitions
            }
        }
        
        function getPropertyElements(element){
            if(element != null){
                if(element.properties){
                    return element.properties
                }
            } else {
                return undefined
            }
            
        }

        function createDefSectionElements(element){
            defSectionElements = getDefSectionElements(element)
            if(defSectionElements != undefined){
                for(var item in defSectionElements){
                    if(!(item.type in dataTypes)){
                        if(item.type in JS4GeoDataTypes){

                        } else {
                            create_New_Complex_NodeShape(defSectionElements[item],item)
                        }
                    }
                }
                mappedDatatypes.push(item)
            }
        }

        function createSchemaSectionElementes(element){
            // schemaSectionElements = getPropertyElements(element)
            // if(schemaSectionElements != undefined){
            //     for(var item in schemaSectionElements){
            //         if(schemaSectionElements[item].type in dataTypes){
            //             shacl += setPrimitiveProperty(schemaSectionElements[item],item,checkRequired(element,item))
            //         } else{
            //             shacl += create_Complex_Property(schemaSectionElements[item],item)
            //         }
            //     }
            // }
            nodesReady['JS_id'] = setMainNodeShape() + create_New_Complex_NodeShape_Structure(element,'JS_id')
        }

        function setMainNodeShape(element){
            addPrefixes['ex'] = true
            addPrefixes['sh'] = true

            var local = 'ex:JS_id_Shape a sh:NodeShape;\n' + addSpaces() + 'sh:targetClass ex:JS_id'
            return local
        }

        function setGenericArrayProperty(element,name,required,last){
            var local = ''

            if(name != null){
                local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath rdf:rest] rdf:first);\n` + addSpaces(-1) + '];\n'
            }else{
                local += addSpaces(1) + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath rdf:rest] rdf:first);\n` + addSpaces(-1) + '];\n'
            }


            if(required){
                local += addSpaces() + 'sh:minCount 1;\n'
            }

            if(name!=null){
                local += addSpaces(-1) + ']'
                if(last!=null){
                   if(last){
                        local += '.\n'
                    } else {
                        local += ';\n'
                    } 
                }else{
                    local += '\n'
                }
                
            }
            
            return local
        }

        function setListValidationArrayProperty(element,name,required,last,specialCase=false){
            var local = ''

            if(specialCase){
                local += addSpaces(1) + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath rdf:rest] rdf:first);\n`
            } else {
                local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n` + addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ([sh:zeroOrMorePath rdf:rest] rdf:first);\n`
            }
            
            if('$ref' in element.items){
                local += addSpaces() + `sh:datatype ex:${element.items.$ref.split('/')[2]}_Shape;\n` + addSpaces(-1) + '];\n'
            } else {
                if(element.items.type in dataTypes){
                    addPrefixes['xsd'] = true
                    local += addSpaces() + `sh:datatype xsd:${dataTypes[element.items.type]};\n`

                    if(specialCase){
                        local += addSpaces(-1) + '].\n'
                    } else {
                        local += addSpaces(-1) + '];\n'
                    }

                } else {
                    number++
                    
                    local += addSpaces() + `sh:datatype ex:obj${number}_Shape;\n` 

                    if(specialCase){
                        local += addSpaces(-1) + '].\n'
                    } else {
                        local += addSpaces(-1) + '];\n'
                    }

                    newNodes['obj'+number] = element.items
                }
                
            }
            if(required){
                local += addSpaces() + 'sh:minCount 1;\n'
            }

            if(!specialCase){
                local += addSpaces(-1) + ']'
            }

            if(!specialCase){
                if(last != null){
                    if(last){
                        local += '.\n'
                    } else {
                        local += ';\n'
                    }
                }else{
                    local += '\n'
                }
                
            }
            

            return local
        }

        function setTupleArrayProperty(element,name,required,last){
            var local = ''
            var index = 0

            if(name != null){
                local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node dash:ListShape;\n`
            } else {
                local += addSpaces(1) + `sh:node dash:ListShape;\n`
            }


            element.items.forEach(element_ => {

                checkUndefined(element_)

                if(element_.type in dataTypes){

                    addPrefixes['xsd'] = true

                    local += addSpaces() + `sh:property [\n`
                    if(index == 0){
                        local += addSpaces(1) + `sh:path rdf:first;\n`
                    } else {
                        var str = '('

                        for(var i = 0 ; i < index ; i++){
                            str += 'rdf:rest '
                        }

                        str += 'rdf:first)'

                        local += addSpaces(1) + `sh:path ${str};\n`
                    }
                    local += addSpaces() + `sh:datatype xsd:${dataTypes[element_.type]};\n` + addSpaces(-1) + '];\n'
                } else {
                    local += addSpaces() + `sh:property [\n`
                    if(index == 0){
                        local += addSpaces(1) + `sh:path rdf:first;\n`
                    } else {
                        var str = '('

                        for(var i = 0 ; i < index ; i++){
                            str += 'rdf:rest '
                        }

                        str += 'rdf:first)'

                        local += addSpaces(1) + `sh:path ${str};\n`
                    }

                    number++
                    newNodes['obj'+number] = element_

                    local += addSpaces() + `sh:node ex:obj${number}_Shape;\n` + addSpaces(-1) + '];\n'

                }
                if(element_ == element.items[element.items.length-1]){

                    if(name != null){
                        local += addSpaces(-1) + ']'
                        if(last!=null){
                            if(last){
                                local += '.\n'
                            } else {
                                local += ';\n'
                            }
                        }else{
                            local += '\n'
                        }
                        
                    }
                    
                }
                index++
            })

            return local
        }

        function setArray(element,name,required,last,specialCase){
            var local

            addPrefixes['dash'] = true
            addPrefixes['rdf'] = true

            checkUndefined(element)

            if('type' in element && 'items' in element && element['items'].length != undefined){
                local = setTupleArrayProperty(element,name,required,last=last)
            } else if ('type' in element && 'items' in element){
                local = setListValidationArrayProperty(element,name,required,last=last,specialCase)
            } else {
                local = setGenericArrayProperty(element,name,required,last=last)
            }
            return local
        }

        function setPrimitiveProperty(element,name,required,last){
            var local = ''

            addPrefixes['xsd'] = true

            if(name != null){
                local += addSpaces() + 'sh:property [\n'
            }            

            checkUndefined(element,true)

            if(name != null){
                local += addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:datatype xsd:${dataTypes[element.type]};\n`
            } else {
                // if(dataTypes[element] != undefined){
                //     local += addSpaces(1) + `sh:datatype xsd:${dataTypes[element]};\n`
                // } else {
                //     local += addSpaces(1) + `sh:datatype ex:${element};\n`
                // }
                local += addSpaces(1) + `sh:datatype xsd:${dataTypes[element.type]};\n`
                
            }
            for(var item in element){
                if(item in constraints){
                    if(item == 'const' || item == 'enum'){
                        try{
                            var str = ''
                            element.forEach(Element_ => {
                                str += `"${Element_}" `
                            })
            
                            local += addSpaces() + `sh:${constraints[item]} (${str});\n`
                        } catch{
                            local += addSpaces() + `sh:${constraints[item]} ("${element[item]}");\n`
                        }

                    } else if(item == 'pattern' || item == "description" || item == "title" || (item == "default" && element.type == "string")){
                        local += addSpaces() + `sh:${constraints[item]} "${element[item]}";\n`
                    } else {
                        local += addSpaces() + `sh:${constraints[item]} ${element[item]};\n`
                    }
                    
                }
            }
            if(required){
                local += addSpaces() + `sh:minCount 1;\n`
            }

            if(name != null){
                local += addSpaces(-1) + ']'
                if(last!=null){
                    if(last){
                        local += '.\n'
                    } else {
                        local += ';\n'
                    }
                }else{
                    local += '\n'
                }
                
            }

            return local
        }
        
        function setComplexNodeShape(element,name,required,ref = null,last){
            var local = ''

            checkUndefined(element)

            if(name != null){
                if(ref != null){
                    local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node ex:${ref}_Shape;\n`
                } else {
                    newNodes[name] = element

                    local += addSpaces() + `sh:property [\n` + addSpaces(1) + `sh:path ex:${name};\n` + addSpaces() + `sh:node ex:${name}_Shape;\n`
                }
                if(required){
                    local += addSpaces() + `sh:minCount 1;\n`
                }

                local += addSpaces(-1) + ']'

                if(last!=null){
                    if(last){
                        local += '.\n'
                    } else {
                        local += ';\n'
                    }
                }else{
                    local += '\n'
                }
                
                
            } else {
                // Excecao para tratar nodes em allOf, anyOf e oneOf.
                number++
                newNodes['obj'+number] = element

                local += addSpaces(1) + `sh:node ex:obj${number}_Shape;\n` 
            }
            return local
        }

        function setShInProperty(element,name,item,required){
            var local = ''
            local += addSpaces() + `sh:property [\n` 
            scope++

            if(item != undefined){
                local += addSpaces() + `sh:path ex:${item};\n`
            }

            var str = ''
            
            try{
                element.forEach(Element_ => {
                    str += `"${Element_}" `
                })

                local += addSpaces() + `sh:in (${str});\n`
            } catch{
                local += addSpaces() + `sh:in (${element[name]});\n`
            }

            if(required){
                local += addSpaces() + `sh:minCount 1;\n`
            }
            local += addSpaces(-1) + `];\n`
            return local
        }

        //#region NAO TA FUNCIONANDO

        function setOthersProperty(element,name,especialCase,path){
            var local = ''

            if(especialCase){
                local += addSpaces() + 'sh:property [\n' + addSpaces(1) + `sh:path ex:${path};\n`
            }

            if(name == 'allOf'){
                local += addSpaces() + 'sh:and (\n'
            } else if(name == 'oneOf'){
                local += addSpaces() + 'sh:xone (\n'
            } else {
                local += addSpaces() + 'sh:or (\n'
            }
            scope++
            element.forEach(element_ => {
                if('$ref' in element_){
                    local += addSpaces() + `ex:${element_.$ref.split('/')[2]}_shape\n`
                } else {
                    if(element_.type){
                        if(element_.type in dataTypes){
                            local += addSpaces() + '[\n'

                            local += setPrimitiveProperty(element_,null,checkRequired(element_,i),null)

                            local += addSpaces(-1) + ']\n'
                        } else if(element_.type == 'array'){
                            local += addSpaces() + '[\n'

                            local += setArray(element_,null,false,last=null,specialCase=true)

                            local += addSpaces(-1) + ']\n'
                        } else if(element_.type == 'object'){
                            local += addSpaces() + '[\n'

                            local += setComplexNodeShape(element_,null,false,null,null)

                            local += addSpaces(-1) + ']\n'
                        } 
                    } else {
                        for(var i in element_){
                            if(element_[i].$ref){
                                local += addSpaces() + '[\n'

                                local +=  addSpaces(1) + `sh:path ex:${i};\n` + addSpaces() + `sh:node ex:${element_[i].$ref.split('/')[2]}_shape.\n`
    
                                local += addSpaces(-1) + ']\n'
                            } else {
                                if(element_[i].type in dataTypes){
                                    local += addSpaces() + '[\n'
                                    
                                    scope++
                                    local += setPrimitiveProperty(element_[i],i,checkRequired(element_,i),null)
        
                                    local += addSpaces(-1) + ']\n'
                                } else if(element_[i].type == 'array'){
                                    local += addSpaces() + '[\n'
                                    
                                    local += setArray(element_[i],i,false,last=null,specialCase=true)
        
                                    local += addSpaces(-1) + ']\n'
                                } else if(element_[i].type == 'object'){
                                    local += addSpaces() + '[\n'

                                    scope++
                                    local += setComplexNodeShape(element_[i],i,false,null,null)
        
                                    local += addSpaces(-1) + ']\n'
                                } 
                            }
                        }
                    }
                }
            })

            local += addSpaces(-1) + ');\n'

            if(especialCase){
                local += addSpaces(-1) + '];\n'
            }
            return local
        }

        //#endregion

        function create_New_Complex_NodeShape(element,name){
            scope = 1
            var node = `ex:${name}_Shape a sh:NodeShape;\n` + addSpaces() + `sh:targetClass ex:${name}`

            nodesReady[name] = node + create_New_Complex_NodeShape_Structure(element,name)
        }

        function create_Complex_Property(element,name){
            var local = ''

        }

        function create_New_Complex_NodeShape_Structure(element,name){
            var local = ''
            var propertiesElements = getPropertyElements(element)

            checkUndefined(element)
            if(propertiesElements != undefined){
                
                if(isEmpty(propertiesElements)){
                    local += '.\n'
                } else {
                    local += ';\n'
                }
                for(var item in propertiesElements){
                    
                    var last = checkLastElement(propertiesElements,item)
                    
                    if(propertiesElements[item].type in dataTypes){
                        local += setPrimitiveProperty(propertiesElements[item],item,checkRequired(element,item),last=last)
                    } else if(propertiesElements[item].type == 'object'){
                        newNodes[item] = propertiesElements[item]
                        local += setComplexNodeShape(propertiesElements[item],item,checkRequired(element,item),null,last)
                    } else if(propertiesElements[item].type == 'array'){
                        local += setArray(propertiesElements[item],item,checkRequired(element,item),last=last)
                    } else if(propertiesElements[item].$ref){
                        local += setComplexNodeShape(null,item,checkRequired(element,item),propertiesElements[item].$ref.split('/')[2],last=last)
                    } else if(item in anotherConstraints){
                        local += setOthersProperty(propertiesElements[item],item)
                    } else {
                        
                        for(var i in propertiesElements[item]){
                            if (i in constraints){
                                local += setShInProperty(propertiesElements[item],i,item,checkRequired(element,item))
                            }
                            else if(i in anotherConstraints){
                                local += setOthersProperty(propertiesElements[item][i],i,true,item)
                            }
                        }
                    }
                }
            } else if(element != null) {
                if(element.type == 'array'){
                    local += ';\n'
                    local += setArray(element,name,checkRequired(element,name),last=true,specialCase=true)
                } else if(element.type in dataTypes){
                    local += ';\n'
                    local += setPrimitiveProperty(element,name,checkRequired(element,name),last=true)
                } 
                else if(element.type == 'object'){
                    local += '.\n'
                } 
                else {
                    for(var i in element){
                        if(i in anotherConstraints){
                            local += ';\n'
                            local += setOthersProperty(element[i],i)
                        } else if(i in constraints){
                            local += ';\n'
                            local += setShInProperty(element[i],i,required=checkRequired(element,i))
                        } 
                    }
                }
            }

            return local
        }
        
        //#region FUNCTIONS TO HELP

        function isEmpty(obj) {
            for(var key in obj) {
                if(obj.hasOwnProperty(key))
                    return false;
            }
            return true;
        }

        function checkLastElement(element,name){
            var index = []

            for(var i in element){
                if(!(i in constraints || i in anotherConstraints )){
                    index.push(i)
                }
            }
            if(name == index[index.length-1]){
                return true
            } else {
                return false
            }
        }

        function checkUndefined(element,primitive){
            for(var i in element){
                if(!(i in constraints || i in anotherConstraints || i in jsonReservedWords)){
                    var local = `{"${i}": ${JSON.stringify(element[i])}}`

                    elementsUndefined.push({schema:local,element:i,primitive:primitive})
                }
            }
        }
        
        function addSpaces(quant = 0){
            scope += quant
            return Array(scope*2).fill(' ').join('')
        }
        
        function checkRequired(schema,item){
            var op = false
            if(schema.required){
                schema.required.forEach(itemRequired => {
                    if(item == itemRequired){
                        op = true
                    }
                });
            } else {
                
            }
            return op
        }
        
        //#endregion
        
        //#region SETUP SECTION
        
        function setup(schema) {
            t0 = performance.now()
            setMainNodeShape(schema)
            createDefSectionElements(schema)
            createSchemaSectionElementes(schema)
        }
        
        setup(schema)
        
        //#endregion

        

        while(Object.keys(nodesReady).length > 0 || Object.keys(newNodes).length > 0){
            for(var i in newNodes){
                create_New_Complex_NodeShape(newNodes[i],i)
                delete newNodes[i]
            }
            for(var i in nodesReady){
                shacl += '\n' + nodesReady[i]
                delete nodesReady[i]
            }
        }

        for(var i in addPrefixes){
            shacl = prefix[i] + '\n' + shacl
        }

        log += `${elementsUndefined.length} Warnings (Elements ignored!)\n\n`

        for(var i in elementsUndefined){
            log += 'Key: ' + elementsUndefined[i].element
            if(elementsUndefined[i].primitive){
              log += ' => ATTENTION THIS IS A PRIMITIVE ELEMENT, IT MAY NOT BE ACCURATE!!!'
            }
            log += `\nElement: ${elementsUndefined[i].schema}\n\n`
        }

        t1 = performance.now()

        return {shacl:shacl,log:log,elements:elementsUndefined,time:t1-t0}
    }
}
