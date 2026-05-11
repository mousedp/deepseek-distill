/**
 * 生成π核心的Safetensors格式文件
 * 使用Node.js实现，无需Python
 */

const fs = require('fs');
const path = require('path');

// BBP公式计算π的第n位十六进制
function bbpDigit(n) {
    let x = 0.0;
    for (let k = 0; k <= n; k++) {
        const ak = 1 / Math.pow(16, n - k);
        const bk = (4/(8*k+1)) - (2/(8*k+4)) - (1/(8*k+5)) - (1/(8*k+6));
        x += ak * bk;
    }
    return Math.floor((x % 1) * 16);
}

// 计算π的前n位
function computePiDigits(n) {
    const digits = [];
    for (let i = 0; i < n; i++) {
        digits.push(bbpDigit(i));
    }
    return digits;
}

// 创建safetensors文件
function writeSafetensors(filename, tensors) {
    const header = {};
    let offset = 0;
    
    // 构建头部信息
    for (const [name, tensor] of Object.entries(tensors)) {
        const shape = tensor.shape;
        const dtype = tensor.dtype;
        
        // 计算数据大小
        const numElements = shape.reduce((a, b) => a * b, 1);
        const elementSize = dtype === 'F64' ? 8 : 4;
        const dataSize = numElements * elementSize;
        
        header[name] = {
            dtype: dtype,
            shape: shape,
            data_offsets: [offset, offset + dataSize]
        };
        
        offset += dataSize;
    }
    
    // 序列化头部
    const headerJson = JSON.stringify(header);
    const headerBytes = Buffer.from(headerJson, 'utf-8');
    const headerLen = headerBytes.length;
    
    // 8字节对齐
    const padding = (8 - (headerLen % 8)) % 8;
    const totalHeaderLen = headerLen + padding;
    
    // 构建文件
    const fileBuffer = Buffer.alloc(8 + totalHeaderLen + offset);
    
    // 写入头部长度 (8字节, 小端)
    fileBuffer.writeBigUInt64LE(BigInt(totalHeaderLen), 0);
    
    // 写入头部JSON
    headerBytes.copy(fileBuffer, 8);
    
    // 写入填充
    for (let i = 0; i < padding; i++) {
        fileBuffer[8 + headerLen + i] = 0;
    }
    
    // 写入张量数据
    let dataOffset = 8 + totalHeaderLen;
    for (const [name, tensor] of Object.entries(tensors)) {
        const data = tensor.data;
        
        if (tensor.dtype === 'F32') {
            for (let i = 0; i < data.length; i++) {
                fileBuffer.writeFloatLE(data[i], dataOffset + i * 4);
            }
            dataOffset += data.length * 4;
        } else if (tensor.dtype === 'F64') {
            for (let i = 0; i < data.length; i++) {
                fileBuffer.writeDoubleLE(data[i], dataOffset + i * 8);
            }
            dataOffset += data.length * 8;
        }
    }
    
    // 写入文件
    fs.writeFileSync(filename, fileBuffer);
    
    console.log(`已生成: ${filename}`);
    console.log(`文件大小: ${fileBuffer.length} 字节`);
    console.log(`张量数量: ${Object.keys(tensors).length}`);
    
    for (const [name, info] of Object.entries(header)) {
        console.log(`  ${name}: shape=[${info.shape.join(',')}], dtype=${info.dtype}`);
    }
}

// 生成基于π的神经网络权重
function generatePiModel() {
    // 计算π的位数
    const piDigits = computePiDigits(10000);
    
    // 归一化到[-1, 1]
    const piNormalized = piDigits.map(d => (d / 7.5) - 1.0);
    
    const tensors = {};
    
    // 1. 嵌入层权重
    const embeddingDim = 64;
    const vocabSize = 256;
    const embedding = {
        shape: [vocabSize, embeddingDim],
        dtype: 'F32',
        data: new Float32Array(vocabSize * embeddingDim)
    };
    
    for (let i = 0; i < vocabSize; i++) {
        for (let j = 0; j < embeddingDim; j++) {
            const idx = (i * embeddingDim + j) % piNormalized.length;
            embedding.data[i * embeddingDim + j] = piNormalized[idx];
        }
    }
    tensors['embed.weight'] = embedding;
    
    // 2. 第一层权重
    const hiddenSize = 128;
    const w1 = {
        shape: [embeddingDim, hiddenSize],
        dtype: 'F32',
        data: new Float32Array(embeddingDim * hiddenSize)
    };
    
    for (let i = 0; i < embeddingDim; i++) {
        for (let j = 0; j < hiddenSize; j++) {
            const idx = (i * hiddenSize + j) % piNormalized.length;
            w1.data[i * hiddenSize + j] = piNormalized[idx] * 0.1;
        }
    }
    tensors['layers.0.weight'] = w1;
    
    // 3. 第一层偏置
    const b1 = {
        shape: [hiddenSize],
        dtype: 'F32',
        data: new Float32Array(hiddenSize)
    };
    
    for (let i = 0; i < hiddenSize; i++) {
        const idx = i % piNormalized.length;
        b1.data[i] = piNormalized[idx] * 0.01;
    }
    tensors['layers.0.bias'] = b1;
    
    // 4. 第二层权重
    const w2 = {
        shape: [hiddenSize, hiddenSize],
        dtype: 'F32',
        data: new Float32Array(hiddenSize * hiddenSize)
    };
    
    for (let i = 0; i < hiddenSize; i++) {
        for (let j = 0; j < hiddenSize; j++) {
            const idx = (i * hiddenSize + j) % piNormalized.length;
            w2.data[i * hiddenSize + j] = piNormalized[idx] * 0.1;
        }
    }
    tensors['layers.1.weight'] = w2;
    
    // 5. 第二层偏置
    const b2 = {
        shape: [hiddenSize],
        dtype: 'F32',
        data: new Float32Array(hiddenSize)
    };
    
    for (let i = 0; i < hiddenSize; i++) {
        const idx = i % piNormalized.length;
        b2.data[i] = piNormalized[idx] * 0.01;
    }
    tensors['layers.1.bias'] = b2;
    
    // 6. 输出层权重
    const outputSize = 16;
    const w3 = {
        shape: [hiddenSize, outputSize],
        dtype: 'F32',
        data: new Float32Array(hiddenSize * outputSize)
    };
    
    for (let i = 0; i < hiddenSize; i++) {
        for (let j = 0; j < outputSize; j++) {
            const idx = (i * outputSize + j) % piNormalized.length;
            w3.data[i * outputSize + j] = piNormalized[idx] * 0.1;
        }
    }
    tensors['output.weight'] = w3;
    
    // 7. 输出层偏置
    const b3 = {
        shape: [outputSize],
        dtype: 'F32',
        data: new Float32Array(outputSize)
    };
    
    for (let i = 0; i < outputSize; i++) {
        const idx = i % piNormalized.length;
        b3.data[i] = piNormalized[idx] * 0.01;
    }
    tensors['output.bias'] = b3;
    
    return tensors;
}

// 主程序
console.log("=== 生成π核心 Safetensors 模型 ===");
console.log("格式: Hugging Face Safetensors");
console.log("用途: 神经网络预训练权重\n");

const tensors = generatePiModel();
writeSafetensors("pi_model.safetensors", tensors);

console.log("\n模型结构:");
console.log("  输入: 256维 (字节值)");
console.log("  嵌入: 64维");
console.log("  隐藏层: 128维 x 2");
console.log("  输出: 16维 (π位预测)");
console.log("\n权重来源: π的BBP公式计算位");
console.log("\n文件位置:", path.resolve("pi_model.safetensors"));
