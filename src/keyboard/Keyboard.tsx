import React, {
  SetStateAction,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Request } from "@zmkfirmware/zmk-studio-ts-client";
import { call_rpc } from "../rpc/logging";
import {
  PhysicalLayout,
  Keymap,
  SetLayerBindingResponse,
  SetLayerPropsResponse,
  BehaviorBinding,
  Layer,
} from "@zmkfirmware/zmk-studio-ts-client/keymap";
import type { GetBehaviorDetailsResponse } from "@zmkfirmware/zmk-studio-ts-client/behaviors";

import { LayerPicker } from "./LayerPicker";
import { PhysicalLayoutPicker } from "./PhysicalLayoutPicker";
import { Keymap as KeymapComp } from "./Keymap";
import { useConnectedDeviceData } from "../rpc/useConnectedDeviceData";
import { ConnectionContext } from "../rpc/ConnectionContext";
import { DoCallback, UndoRedoContext } from "../undoRedo";
import { BehaviorBindingPicker } from "../behaviors/BehaviorBindingPicker";
import { produce } from "immer";
import { LockStateContext } from "../rpc/LockStateContext";
import { LockState } from "@zmkfirmware/zmk-studio-ts-client/core";
import { deserializeLayoutZoom, LayoutZoom } from "./PhysicalLayout";
import { useLocalStorageState } from "../misc/useLocalStorageState";
import { DeviceSettings } from "./DeviceSettings";
import { bb9981Rpc } from "../rpc/bb9981Rpc";
import { useSubprofiles } from "../rpc/useBB9981";
import { useSub } from "../usePubSub";
import type { SubProfileSummary } from "../rpc/bb9981Types";

type MainView = "keymap" | "subprofiles" | "global";

type StudioBehaviorDetails = GetBehaviorDetailsResponse & {
  isUserDefined?: boolean;
};

type BehaviorMap = Record<number, StudioBehaviorDetails>;
type StoredBinding = { behaviorId: number; param1: number; param2: number };
const DEFAULT_SUBPROFILES: SubProfileSummary[] = [
  {
    index: 0,
    name: "Profile 1",
    active: true,
    initialized: false,
    integrityIssueCount: 0,
    integrityRepairCount: 0,
  },
  {
    index: 1,
    name: "Profile 2",
    active: false,
    initialized: false,
    integrityIssueCount: 0,
    integrityRepairCount: 0,
  },
  {
    index: 2,
    name: "Profile 3",
    active: false,
    initialized: false,
    integrityIssueCount: 0,
    integrityRepairCount: 0,
  },
];

function normalizeBehaviorId(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  if (value && typeof value === "object") {
    const candidate = value as { toNumber?: () => number; low?: number };

    if (typeof candidate.toNumber === "function") {
      try {
        const parsed = candidate.toNumber();
        return Number.isFinite(parsed) ? parsed : fallback;
      } catch (_error) {
        return fallback;
      }
    }

    if (typeof candidate.low === "number") {
      return candidate.low;
    }
  }

  return fallback;
}

function useBehaviors(keymap?: Keymap | null): BehaviorMap {
  let connection = useContext(ConnectionContext);
  let lockState = useContext(LockStateContext);

  const [behaviors, setBehaviors] = useState<BehaviorMap>({});
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    return bb9981Rpc.behaviors.onChange(() => {
      setRefreshVersion((version) => version + 1);
    });
  }, []);

  useEffect(() => {
    if (
      !connection.conn ||
      lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setBehaviors({});
      return;
    }

    async function startRequest() {
      if (!connection.conn) {
        return;
      }

      try {
        let get_behaviors: Request = {
          behaviors: { listAllBehaviors: true },
          requestId: 0,
        };

        let behavior_list = await call_rpc(connection.conn, get_behaviors);
        if (!ignore) {
          const behaviorIds = new Set<number>();

          for (let behaviorId of behavior_list.behaviors?.listAllBehaviors
            ?.behaviors || []) {
            behaviorIds.add(normalizeBehaviorId(behaviorId));
          }

          for (const layer of keymap?.layers ?? []) {
            for (const binding of layer.bindings ?? []) {
              behaviorIds.add(normalizeBehaviorId(binding.behaviorId));
            }
          }

          const detailResponses = await Promise.all(
            [...behaviorIds].map(async (behaviorId) => ({
              behaviorId,
              details: await bb9981Rpc.behaviors.getBehaviorDetails(behaviorId),
            }))
          );

          if (!ignore) {
            const behavior_map: BehaviorMap = {};

            for (const { details } of detailResponses) {
              if (!details) {
                continue;
              }

              const normalizedDetails: StudioBehaviorDetails = {
                ...details,
                id: normalizeBehaviorId(details.id),
              };
              behavior_map[normalizedDetails.id] = normalizedDetails;
            }

            setBehaviors(behavior_map);
          }
        }
      } catch (error) {
        console.error("Failed to load behaviors", error);
        if (!ignore) {
          setBehaviors({});
        }
      }
    }

    let ignore = false;
    startRequest();

    return () => {
      ignore = true;
    };
  }, [connection, keymap, lockState, refreshVersion]);

  return behaviors;
}

function useLayouts(): [
  PhysicalLayout[] | undefined,
  React.Dispatch<SetStateAction<PhysicalLayout[] | undefined>>,
  number,
  React.Dispatch<SetStateAction<number>>
] {
  let connection = useContext(ConnectionContext);
  let lockState = useContext(LockStateContext);

  const [layouts, setLayouts] = useState<PhysicalLayout[] | undefined>(
    undefined
  );
  const [selectedPhysicalLayoutIndex, setSelectedPhysicalLayoutIndex] =
    useState<number>(0);

  useEffect(() => {
    if (
      !connection.conn ||
      lockState != LockState.ZMK_STUDIO_CORE_LOCK_STATE_UNLOCKED
    ) {
      setLayouts(undefined);
      return;
    }

    async function startRequest() {
      setLayouts(undefined);

      if (!connection.conn) {
        return;
      }

      try {
        let response = await call_rpc(connection.conn, {
          keymap: { getPhysicalLayouts: true },
        });

        if (!ignore) {
          setLayouts(response?.keymap?.getPhysicalLayouts?.layouts);
          setSelectedPhysicalLayoutIndex(
            response?.keymap?.getPhysicalLayouts?.activeLayoutIndex || 0
          );
        }
      } catch (error) {
        console.error("Failed to load physical layouts", error);
        if (!ignore) {
          setLayouts(undefined);
        }
      }
    }

    let ignore = false;
    startRequest();

    return () => {
      ignore = true;
    };
  }, [connection, lockState]);

  return [
    layouts,
    setLayouts,
    selectedPhysicalLayoutIndex,
    setSelectedPhysicalLayoutIndex,
  ];
}

export default function Keyboard({
  onMainViewChanged,
}: {
  onMainViewChanged?: (view: MainView) => void;
}) {
  const [
    layouts,
    _setLayouts,
    selectedPhysicalLayoutIndex,
    setSelectedPhysicalLayoutIndex,
  ] = useLayouts();
  const [keymap, setKeymap] = useConnectedDeviceData<Keymap>(
    { keymap: { getKeymap: true } },
    (keymap) => {
      console.log("Got the keymap!");
      return keymap?.keymap?.getKeymap;
    },
    true
  );

  const [keymapScale, setKeymapScale] = useLocalStorageState<LayoutZoom>("keymapScale", "auto", {
    deserialize: deserializeLayoutZoom,
  });
  const [copiedBinding, setCopiedBinding] = useLocalStorageState<StoredBinding | null>(
    "bb9981CopiedBinding",
    null
  );

  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [selectedKeyPosition, setSelectedKeyPosition] = useState<
    number | undefined
  >(undefined);
  const behaviors = useBehaviors(keymap);
  const [mainView, setMainView] = useState<MainView>("keymap");
  const keymapRefreshInFlight = useRef(false);
  const { state: subprofileState, loading: subprofilesLoading, error: subprofilesError, switchProfile } =
    useSubprofiles();
  const subprofileButtons = subprofileState?.profiles?.length
    ? subprofileState.profiles
    : DEFAULT_SUBPROFILES;

  useEffect(() => {
    onMainViewChanged?.(mainView);
  }, [mainView, onMainViewChanged]);

  const conn = useContext(ConnectionContext);
  const undoRedo = useContext(UndoRedoContext);
  const runUndoable = useCallback(
    (description: string, action: DoCallback) => {
      if (!undoRedo) {
        return;
      }

      void undoRedo(action).catch((error) => {
        console.error(`Failed to ${description}`, error);
      });
    },
    [undoRedo]
  );

  useEffect(() => {
    setSelectedLayerIndex(0);
    setSelectedKeyPosition(undefined);
  }, [conn]);

  const refreshKeymap = useCallback(async () => {
    if (!conn.conn) {
      return;
    }

    if (keymapRefreshInFlight.current) {
      return;
    }

    keymapRefreshInFlight.current = true;

    try {
      const resp = await call_rpc(conn.conn, { keymap: { getKeymap: true } });
      if (resp.keymap?.getKeymap) {
        setKeymap(resp.keymap.getKeymap);
      }
    } catch (error) {
      console.error("Failed to refresh keymap", error);
    } finally {
      keymapRefreshInFlight.current = false;
    }
  }, [conn.conn, setKeymap]);

  useSub("rpc_notification.settings.subprofileStateChanged", (state) => {
    if (state?.switching) {
      return;
    }
    void refreshKeymap();
  });

  useEffect(() => {
    async function performSetRequest() {
      if (!conn.conn || !layouts) {
        return;
      }

      try {
        let resp = await call_rpc(conn.conn, {
          keymap: { setActivePhysicalLayout: selectedPhysicalLayoutIndex },
        });

        let new_keymap = resp?.keymap?.setActivePhysicalLayout?.ok;
        if (new_keymap) {
          setKeymap(new_keymap);
        } else {
          console.error(
            "Failed to set the active physical layout err:",
            resp?.keymap?.setActivePhysicalLayout?.err
          );
        }
      } catch (error) {
        console.error("Failed to set the active physical layout", error);
      }
    }

    void performSetRequest();
  }, [selectedPhysicalLayoutIndex]);

  let doSelectPhysicalLayout = useCallback(
    (i: number) => {
      let oldLayout = selectedPhysicalLayoutIndex;
      runUndoable("change the physical layout", async () => {
        setSelectedPhysicalLayoutIndex(i);

        return async () => {
          setSelectedPhysicalLayoutIndex(oldLayout);
        };
      });
    },
    [runUndoable, selectedPhysicalLayoutIndex]
  );

  let doUpdateBinding = useCallback(
    (binding: BehaviorBinding) => {
      if (!keymap || selectedKeyPosition === undefined) {
        console.error(
          "Can't update binding without a selected key position and loaded keymap"
        );
        return;
      }

      const layer = selectedLayerIndex;
      const layerId = keymap.layers[layer].id;
      const keyPosition = selectedKeyPosition;
      const oldBinding = keymap.layers[layer].bindings[keyPosition];
      runUndoable("update a key binding", async () => {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        let resp = await call_rpc(conn.conn, {
          keymap: { setLayerBinding: { layerId, keyPosition, binding } },
        });

        if (
          resp.keymap?.setLayerBinding ===
          SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK
        ) {
          setKeymap(
            produce((draft: any) => {
              draft.layers[layer].bindings[keyPosition] = binding;
            })
          );
        } else {
          console.error("Failed to set binding", resp.keymap?.setLayerBinding);
        }

        return async () => {
          if (!conn.conn) {
            return;
          }

          let resp = await call_rpc(conn.conn, {
            keymap: {
              setLayerBinding: { layerId, keyPosition, binding: oldBinding },
            },
          });
          if (
            resp.keymap?.setLayerBinding ===
            SetLayerBindingResponse.SET_LAYER_BINDING_RESP_OK
          ) {
            setKeymap(
              produce((draft: any) => {
                draft.layers[layer].bindings[keyPosition] = oldBinding;
              })
            );
          } else {
          }
        };
      });
    },
    [conn, keymap, runUndoable, selectedLayerIndex, selectedKeyPosition]
  );

  let selectedBinding = useMemo(() => {
    if (keymap == null || selectedKeyPosition == null || !keymap.layers[selectedLayerIndex]) {
      return null;
    }

    return keymap.layers[selectedLayerIndex].bindings[selectedKeyPosition];
  }, [keymap, selectedLayerIndex, selectedKeyPosition]);

  const moveLayer = useCallback(
    (start: number, end: number) => {
      const doMove = async (startIndex: number, destIndex: number) => {
        if (!conn.conn) {
          return;
        }

        let resp = await call_rpc(conn.conn, {
          keymap: { moveLayer: { startIndex, destIndex } },
        });

        if (resp.keymap?.moveLayer?.ok) {
          setKeymap(resp.keymap?.moveLayer?.ok);
          setSelectedLayerIndex(destIndex);
        } else {
          console.error("Error moving", resp);
        }
      };

      runUndoable("move a layer", async () => {
        await doMove(start, end);
        return () => doMove(end, start);
      });
    },
    [runUndoable]
  );

  const addLayer = useCallback(() => {
    async function doAdd(): Promise<number> {
      if (!conn.conn || !keymap) {
        throw new Error("Not connected");
      }

      const resp = await call_rpc(conn.conn, { keymap: { addLayer: {} } });

      if (resp.keymap?.addLayer?.ok) {
        const newSelection = keymap.layers.length;
        setKeymap(
          produce((draft: any) => {
            draft.layers.push(resp.keymap!.addLayer!.ok!.layer);
            draft.availableLayers--;
          })
        );

        setSelectedLayerIndex(newSelection);

        return resp.keymap.addLayer.ok.index;
      } else {
        console.error("Add error", resp.keymap?.addLayer?.err);
        throw new Error("Failed to add layer:" + resp.keymap?.addLayer?.err);
      }
    }

    async function doRemove(layerIndex: number) {
      if (!conn.conn) {
        throw new Error("Not connected");
      }

      const resp = await call_rpc(conn.conn, {
        keymap: { removeLayer: { layerIndex } },
      });

      console.log(resp);
      if (resp.keymap?.removeLayer?.ok) {
        setKeymap(
          produce((draft: any) => {
            draft.layers.splice(layerIndex, 1);
            draft.availableLayers++;
          })
        );
      } else {
        console.error("Remove error", resp.keymap?.removeLayer?.err);
        throw new Error(
          "Failed to remove layer:" + resp.keymap?.removeLayer?.err
        );
      }
    }

    runUndoable("add a layer", async () => {
      let index = await doAdd();
      return () => doRemove(index);
    });
  }, [conn, runUndoable, keymap]);

  const removeLayer = useCallback(() => {
    async function doRemove(layerIndex: number): Promise<void> {
      if (!conn.conn || !keymap) {
        throw new Error("Not connected");
      }

      const resp = await call_rpc(conn.conn, {
        keymap: { removeLayer: { layerIndex } },
      });

      if (resp.keymap?.removeLayer?.ok) {
        if (layerIndex == keymap.layers.length - 1) {
          setSelectedLayerIndex(layerIndex - 1);
        }
        setKeymap(
          produce((draft: any) => {
            draft.layers.splice(layerIndex, 1);
            draft.availableLayers++;
          })
        );
      } else {
        console.error("Remove error", resp.keymap?.removeLayer?.err);
        throw new Error(
          "Failed to remove layer:" + resp.keymap?.removeLayer?.err
        );
      }
    }

    async function doRestore(layerId: number, atIndex: number) {
      if (!conn.conn) {
        throw new Error("Not connected");
      }

      const resp = await call_rpc(conn.conn, {
        keymap: { restoreLayer: { layerId, atIndex } },
      });

      console.log(resp);
      if (resp.keymap?.restoreLayer?.ok) {
        setKeymap(
          produce((draft: any) => {
            draft.layers.splice(atIndex, 0, resp!.keymap!.restoreLayer!.ok);
            draft.availableLayers--;
          })
        );
        setSelectedLayerIndex(atIndex);
      } else {
        console.error("Remove error", resp.keymap?.restoreLayer?.err);
        throw new Error(
          "Failed to restore layer:" + resp.keymap?.restoreLayer?.err
        );
      }
    }

    if (!keymap) {
      throw new Error("No keymap loaded");
    }

    let index = selectedLayerIndex;
    let layerId = keymap.layers[index].id;
    runUndoable("remove a layer", async () => {
      await doRemove(index);
      return () => doRestore(layerId, index);
    });
  }, [conn, runUndoable, selectedLayerIndex]);

  const changeLayerName = useCallback(
    (id: number, oldName: string, newName: string) => {
      async function changeName(layerId: number, name: string) {
        if (!conn.conn) {
          throw new Error("Not connected");
        }

        const resp = await call_rpc(conn.conn, {
          keymap: { setLayerProps: { layerId, name } },
        });

        if (
          resp.keymap?.setLayerProps ==
          SetLayerPropsResponse.SET_LAYER_PROPS_RESP_OK
        ) {
          setKeymap(
            produce((draft: any) => {
              const layer_index = draft.layers.findIndex(
                (l: Layer) => l.id == layerId
              );
              draft.layers[layer_index].name = name;
            })
          );
        } else {
          throw new Error(
            "Failed to change layer name:" + resp.keymap?.setLayerProps
          );
        }
      }

      runUndoable("rename a layer", async () => {
        await changeName(id, newName);
        return async () => {
          await changeName(id, oldName);
        };
      });
    },
    [conn, runUndoable, keymap]
  );

  useEffect(() => {
    if (!keymap?.layers) return;

    const layers = keymap.layers.length - 1;

    if (selectedLayerIndex > layers) {
      setSelectedLayerIndex(layers);
    }
  }, [keymap, selectedLayerIndex]);

  const layerInfo = useMemo(
    () =>
      keymap?.layers.map(({ id, name }, li) => ({
        id,
        name: name || li.toLocaleString(),
      })) || [],
    [keymap]
  );

  const copySelectedBinding = useCallback(() => {
    if (!selectedBinding) {
      return;
    }

    setCopiedBinding({
      behaviorId: normalizeBehaviorId(selectedBinding.behaviorId),
      param1: normalizeBehaviorId(selectedBinding.param1),
      param2: normalizeBehaviorId(selectedBinding.param2),
    });
  }, [selectedBinding, setCopiedBinding]);

  const pasteBinding = useCallback(() => {
    if (!copiedBinding) {
      return;
    }

    doUpdateBinding(copiedBinding);
  }, [copiedBinding, doUpdateBinding]);

  return (
    <div className="flex flex-col max-w-full min-w-0 min-h-0 h-full">
      {/* Main View Toggle */}
      <div className="flex border-b border-base-300 bg-base-200 shrink-0">
        <button
          onClick={() => setMainView("keymap")}
          className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
            mainView === "keymap"
              ? "border-primary/50 text-base-content"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          Keymap
        </button>
        <button
          onClick={() => setMainView("subprofiles")}
          className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
            mainView === "subprofiles"
              ? "border-primary/50 text-base-content"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          Sub-Profiles
        </button>
        <button
          onClick={() => setMainView("global")}
          className={`px-5 py-2 text-sm font-medium border-b-2 transition-colors ${
            mainView === "global"
              ? "border-primary/50 text-base-content"
              : "border-transparent text-base-content/60 hover:text-base-content"
          }`}
        >
          Global Settings
        </button>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-base-300 bg-base-200 px-4 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-base-content/60">
            Active Profile
          </span>
          <div className="flex gap-2">
            {subprofileButtons.map((profile) => (
              <button
                key={profile.index}
                onClick={() => void switchProfile(profile.index)}
                className={`rounded border px-3 py-1.5 text-sm transition-colors ${
                  profile.active
                    ? "border-primary/50 bg-primary/20 text-base-content"
                    : "border-base-300 bg-base-100 text-base-content/80 hover:bg-base-300"
                }`}
                disabled={subprofileState?.switching || !subprofileState}
                title={!subprofileState ? "Waiting for subprofile state from the keyboard." : undefined}
              >
                {profile.name}
              </button>
            ))}
          </div>
        </div>
        {subprofilesLoading && (
          <span className="text-xs text-base-content/60">Loading profiles...</span>
        )}
        {!subprofilesLoading && subprofilesError && !subprofileState && (
          <span className="text-xs text-warning-content/80">
            Profile state is temporarily unavailable.
          </span>
        )}
      </div>

      {/* Keymap View */}
      {mainView === "keymap" && (
        <div className="grid grid-cols-[auto_1fr] grid-rows-[1fr_minmax(10em,auto)] bg-base-300 max-w-full min-w-0 min-h-0 flex-1">
          <div className="p-2 flex flex-col gap-2 bg-base-200 row-span-2">
            {layouts && (
              <div className="col-start-3 row-start-1 row-end-2">
                <PhysicalLayoutPicker
                  layouts={layouts}
                  selectedPhysicalLayoutIndex={selectedPhysicalLayoutIndex}
                  onPhysicalLayoutClicked={doSelectPhysicalLayout}
                />
              </div>
            )}

            {keymap && (
              <div className="col-start-1 row-start-1 row-end-2">
                <LayerPicker
                  layers={keymap.layers}
                  selectedLayerIndex={selectedLayerIndex}
                  onLayerClicked={setSelectedLayerIndex}
                  onLayerMoved={moveLayer}
                  canAdd={(keymap.availableLayers || 0) > 0}
                  canRemove={(keymap.layers?.length || 0) > 1}
                  onAddClicked={addLayer}
                  onRemoveClicked={removeLayer}
                  onLayerNameChanged={changeLayerName}
                />
              </div>
            )}
          </div>
          {layouts && keymap && behaviors && (
            <div className="p-2 col-start-2 row-start-1 grid items-center justify-center relative min-w-0">
              <KeymapComp
                keymap={keymap}
                layout={layouts[selectedPhysicalLayoutIndex]}
                behaviors={behaviors}
                scale={keymapScale}
                selectedLayerIndex={selectedLayerIndex}
                selectedKeyPosition={selectedKeyPosition}
                onKeyPositionClicked={setSelectedKeyPosition}
              />
              <select
                className="absolute top-2 right-2 h-8 rounded px-2"
                value={keymapScale}
                onChange={(e) => {
                  const value = deserializeLayoutZoom(e.target.value);
                  setKeymapScale(value);
                }}
              >
                <option value="auto">Auto</option>
                <option value={0.25}>25%</option>
                <option value={0.5}>50%</option>
                <option value={0.75}>75%</option>
                <option value={1}>100%</option>
                <option value={1.25}>125%</option>
                <option value={1.5}>150%</option>
                <option value={2}>200%</option>
              </select>
            </div>
          )}
          {keymap && selectedBinding && (
            <div className="p-2 col-start-2 row-start-2 bg-base-200">
              <div className="mb-2 flex gap-2">
                <button
                  onClick={copySelectedBinding}
                  className="rounded border border-base-300 bg-base-100 px-3 py-1.5 text-sm text-base-content/80 hover:bg-base-300"
                >
                  Copy
                </button>
                <button
                  onClick={pasteBinding}
                  className="rounded border border-base-300 bg-base-100 px-3 py-1.5 text-sm text-base-content/80 hover:bg-base-300 disabled:bg-base-200 disabled:text-base-content/40"
                  disabled={!copiedBinding}
                >
                  Paste
                </button>
              </div>
              <BehaviorBindingPicker
                key={`${selectedLayerIndex}:${selectedKeyPosition ?? "none"}`}
                binding={selectedBinding}
                behaviors={Object.values(behaviors)}
                layers={layerInfo}
                onBindingChanged={doUpdateBinding}
              />
            </div>
          )}
        </div>
      )}

      {mainView === "subprofiles" && (
        <div className="flex-1 overflow-hidden">
          <DeviceSettings
            behaviors={Object.values(behaviors)}
            layers={layerInfo}
            totalKeys={layouts?.[selectedPhysicalLayoutIndex]?.keys?.length ?? 0}
            scope="subprofiles"
          />
        </div>
      )}

      {mainView === "global" && (
        <div className="flex-1 overflow-hidden">
          <DeviceSettings
            behaviors={Object.values(behaviors)}
            layers={layerInfo}
            totalKeys={layouts?.[selectedPhysicalLayoutIndex]?.keys?.length ?? 0}
            scope="global"
          />
        </div>
      )}
    </div>
  );
}
