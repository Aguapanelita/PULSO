/**
 * PULSO — exporter.js
 * Módulo de exportación de creaciones en formatos estándar reales:
 * - Audio: WAV (PCM 16-bit sin pérdidas) y MP3 (codificación real con LameJS).
 * - Modelo 3D: GLB (glTF 2.0 binario estándar mediante THREE.GLTFExporter).
 * - Imagen: PNG (captura en alta resolución del viewport 3D).
 */

export class MediaExporter {
  /**
   * Codifica un AudioBuffer estéreo en un archivo WAV PCM de 16 bits sin pérdidas.
   */
  static audioBufferToWav(buffer) {
    const numChannels = Math.min(2, buffer.numberOfChannels);
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM lineal
    const bitDepth = 16;
    const numSamples = buffer.length;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const headerSize = 44;
    const totalSize = headerSize + dataSize;

    const arrayBuffer = new ArrayBuffer(totalSize);
    const view = new DataView(arrayBuffer);

    // Cabecera RIFF
    const writeString = (offset, str) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, totalSize - 8, true);
    writeString(8, 'WAVE');

    // Sub-bloque "fmt "
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // tamaño de fmt
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);

    // Sub-bloque "data"
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    // Escribir muestras intercaladas L / R en enteros de 16 bits
    const channels = [];
    for (let c = 0; c < numChannels; c++) {
      channels.push(buffer.getChannelData(c));
    }

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        let sample = Math.max(-1, Math.min(1, channels[c][i]));
        // Cuantización a 16 bits con signo
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  }

  /**
   * Codifica un AudioBuffer estéreo en MP3 real (192 kbps) usando LameJS.
   */
  static audioBufferToMp3(buffer) {
    if (typeof lamejs === 'undefined') {
      throw new Error('El codificador MP3 (LameJS) no está cargado.');
    }

    const channels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const kbps = 192;

    const mp3encoder = new lamejs.Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data = [];

    const left = buffer.getChannelData(0);
    const right = channels > 1 ? buffer.getChannelData(1) : left;
    const sampleBlockSize = 1152; // Muestras por bloque en MP3

    // Convertir Float32 a Int16
    const leftInt16 = new Int16Array(left.length);
    const rightInt16 = new Int16Array(right.length);

    for (let i = 0; i < left.length; i++) {
      const sL = Math.max(-1, Math.min(1, left[i]));
      leftInt16[i] = sL < 0 ? sL * 0x8000 : sL * 0x7FFF;

      const sR = Math.max(-1, Math.min(1, right[i]));
      rightInt16[i] = sR < 0 ? sR * 0x8000 : sR * 0x7FFF;
    }

    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
      const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
      const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
      let mp3buf;
      if (channels === 1) {
        mp3buf = mp3encoder.encodeBuffer(leftChunk);
      } else {
        mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
      }
      if (mp3buf.length > 0) {
        mp3Data.push(mp3buf);
      }
    }

    const endBuf = mp3encoder.flush();
    if (endBuf.length > 0) {
      mp3Data.push(endBuf);
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  }

  /**
   * Exporta el modelo 3D en formato binario GLB usando THREE.GLTFExporter.
   */
  static exportGLB(threeObject, filename = 'pulso_escultura') {
    return new Promise((resolve, reject) => {
      if (!THREE.GLTFExporter) {
        return reject(new Error('THREE.GLTFExporter no está disponible.'));
      }

      // Asegurar que todos los filamentos y geometrías sean visibles con drawRange completo
      const originalStates = [];
      threeObject.traverse((child) => {
        if (child.isMesh || child.isLine) {
          const drawRange = child.geometry ? { ...child.geometry.drawRange } : null;
          originalStates.push({ child, visible: child.visible, drawRange });
          child.visible = true;
          if (child.geometry) {
            child.geometry.setDrawRange(0, Infinity);
          }
        }
      });

      const exporter = new THREE.GLTFExporter();
      exporter.parse(
        threeObject,
        (result) => {
          // Restaurar estados originales
          originalStates.forEach(item => {
            item.child.visible = item.visible;
            if (item.drawRange && item.child.geometry) {
              item.child.geometry.setDrawRange(item.drawRange.start, item.drawRange.count);
            }
          });

          if (result instanceof ArrayBuffer) {
            const blob = new Blob([result], { type: 'model/gltf-binary' });
            MediaExporter.downloadBlob(blob, `${filename}.glb`);
            resolve(blob);
          } else {
            const output = JSON.stringify(result, null, 2);
            const blob = new Blob([output], { type: 'text/plain' });
            MediaExporter.downloadBlob(blob, `${filename}.gltf`);
            resolve(blob);
          }
        },
        (error) => {
          originalStates.forEach(item => {
            item.child.visible = item.visible;
            if (item.drawRange && item.child.geometry) {
              item.child.geometry.setDrawRange(item.drawRange.start, item.drawRange.count);
            }
          });
          reject(error);
        },
        { binary: true, embedImages: true }
      );
    });
  }

  /**
   * Captura una imagen PNG en alta resolución de la vista actual del renderer.
   */
  static exportPNG(renderer, filename = 'pulso_escultura') {
    const dataUrl = renderer.domElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /**
   * Desencadena la descarga de un Blob en el navegador.
   */
  static downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 6000);
  }
}
