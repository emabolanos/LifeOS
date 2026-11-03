/*
 * storage.js — Capa de almacenamiento.
 * Es el único archivo que toca localStorage. Para usar otro servicio en el
 * futuro (por ejemplo Supabase) basta con otro adaptador que ofrezca
 * load() y save(data).
 */
(function (L) {
  'use strict';

  const KEY = 'lifeos.data';

  const LocalStorageAdapter = {
    KEY,

    /** Devuelve { data } o { data: null, error: 'unavailable' | 'corrupt' }. */
    load() {
      let raw;
      try {
        raw = localStorage.getItem(KEY);
      } catch (e) {
        return { data: null, error: 'unavailable' };
      }
      if (raw == null) return { data: null };
      try {
        return { data: JSON.parse(raw) };
      } catch (e) {
        this.backupRaw('corrupto', raw);
        return { data: null, error: 'corrupt' };
      }
    },

    /** Lanza un error si no se pudo guardar (por ejemplo, sin espacio). */
    save(data) {
      localStorage.setItem(KEY, JSON.stringify(data));
    },

    /** Guarda una copia del contenido actual sin borrarlo, antes de reemplazarlo. */
    backupRaw(reason, raw) {
      try {
        const content = raw != null ? raw : localStorage.getItem(KEY);
        if (content != null) localStorage.setItem(`${KEY}.respaldo-${reason}-${Date.now()}`, content);
      } catch (e) {
        /* sin espacio: no se puede respaldar */
      }
    },
  };

  L.Storage = LocalStorageAdapter;
})(globalThis.LifeOS = globalThis.LifeOS || {});
