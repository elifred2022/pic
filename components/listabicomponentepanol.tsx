"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ListaBiComponente from "./listabicomponente";
import ListaBiComponenteObservacion from "./listabicomponenteobservacion";

export default function ListaBiComponentePanol() {
  const [mostrarListaBasica, setMostrarListaBasica] = useState(true);
  const [mostrarListaObservacion, setMostrarListaObservacion] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Panel de Pedidos Generales</h1>
      </div>

      {/* Filtros con Checkboxes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros de Visualización</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="lista-basica"
                checked={mostrarListaBasica}
                onCheckedChange={(checked) => 
                  setMostrarListaBasica(checked === true)
                }
              />
              <Label 
                htmlFor="lista-basica" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Mostrar Lista Básica de Pedidos
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="lista-observacion"
                checked={mostrarListaObservacion}
                onCheckedChange={(checked) => 
                  setMostrarListaObservacion(checked === true)
                }
              />
              <Label 
                htmlFor="lista-observacion" 
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Mostrar Pedidos con Observación
              </Label>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p>• <strong>Lista Básica:</strong> Muestra todos los pedidos con información básica (PIC, estado, sector, aprueba)</p>
            <p>• <strong>Pedidos con Observación:</strong> Muestra solo los pedidos que tienen observaciones registradas</p>
          </div>
        </CardContent>
      </Card>

      {/* Componentes de Lista */}
      <div className="space-y-8">
        {/* Lista Básica */}
        {mostrarListaBasica && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-blue-600">
                📋 Lista Básica de Pedidos Generales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ListaBiComponente />
            </CardContent>
          </Card>
        )}

        {/* Lista de Observaciones */}
        {mostrarListaObservacion && (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl text-green-600">
                📝 Pedidos con Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ListaBiComponenteObservacion />
            </CardContent>
          </Card>
        )}

        {/* Mensaje cuando no hay filtros activos */}
        {!mostrarListaBasica && !mostrarListaObservacion && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-gray-500 text-lg mb-2">
                🔍 No hay filtros activos
              </div>
              <p className="text-gray-400">
                Selecciona al menos un tipo de lista para visualizar los pedidos
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

