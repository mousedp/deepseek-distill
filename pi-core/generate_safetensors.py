#!/usr/bin/env python3
"""
生成π核心的safetensors格式权重文件
用于神经网络预训练
"""

import numpy as np
import struct
import json

def compute_pi_digits(n):
    """使用BBP公式计算π的十六进制位"""
    digits = []
    for i in range(n):
        x = 0.0
        for k in range(i + 1):
            ak = 1.0 / (16 ** (i - k))
            bk = (4.0/(8*k+1)) - (2.0/(8*k+4)) - (1.0/(8*k+5)) - (1.0/(8*k+6))
            x += ak * bk
        digit = int((x % 1) * 16)
        digits.append(digit)
    return digits

def create_safetensors_header(tensors):
    """创建safetensors格式的JSON头"""
    header = {}
    offset = 0
    
    for name, tensor in tensors.items():
        shape = list(tensor.shape)
        dtype = str(tensor.dtype)
        
        # 计算数据大小
        num_elements = np.prod(shape)
        if dtype == 'float32':
            element_size = 4
        elif dtype == 'float64':
            element_size = 8
        elif dtype == 'int32':
            element_size = 4
        else:
            element_size = 4
        
        data_size = num_elements * element_size
        
        header[name] = {
            "dtype": dtype,
            "shape": shape,
            "data_offsets": [offset, offset + data_size]
        }
        offset += data_size
    
    return header, offset

def write_safetensors(filename, tensors):
    """写入safetensors格式文件"""
    
    # 创建头部
    header, total_size = create_safetensors_header(tensors)
    header_json = json.dumps(header, separators=(',', ':'))
    header_bytes = header_json.encode('utf-8')
    
    # 计算填充使头部8字节对齐
    header_len = len(header_bytes)
    padding = (8 - (header_len % 8)) % 8
    
    with open(filename, 'wb') as f:
        # 写入头部长度 (8字节, 小端)
        f.write(struct.pack('<Q', header_len + padding))
        
        # 写入头部JSON
        f.write(header_bytes)
        
        # 写入填充
        f.write(b'\x00' * padding)
        
        # 写入张量数据
        for name, tensor in tensors.items():
            f.write(tensor.tobytes())
    
    print(f"已生成: {filename}")
    print(f"张量数量: {len(tensors)}")
    for name, info in header.items():
        print(f"  {name}: shape={info['shape']}, dtype={info['dtype']}")

def generate_pi_model():
    """生成基于π的神经网络权重"""
    
    # 计算π的位数
    pi_digits = compute_pi_digits(10000)
    pi_array = np.array(pi_digits, dtype=np.float32)
    
    # 归一化到[-1, 1]
    pi_normalized = (pi_array / 7.5) - 1.0
    
    tensors = {}
    
    # 1. 嵌入层权重 (基于π的嵌入)
    embedding_dim = 64
    vocab_size = 256
    embedding = np.zeros((vocab_size, embedding_dim), dtype=np.float32)
    
    for i in range(vocab_size):
        for j in range(embedding_dim):
            idx = (i * embedding_dim + j) % len(pi_normalized)
            embedding[i, j] = pi_normalized[idx]
    
    tensors["embed.weight"] = embedding
    
    # 2. 第一层线性变换 (基于π的权重)
    hidden_size = 128
    w1 = np.zeros((embedding_dim, hidden_size), dtype=np.float32)
    
    for i in range(embedding_dim):
        for j in range(hidden_size):
            idx = (i * hidden_size + j) % len(pi_normalized)
            w1[i, j] = pi_normalized[idx] * 0.1  # 缩放
    
    tensors["layers.0.weight"] = w1
    
    # 3. 偏置
    b1 = np.zeros(hidden_size, dtype=np.float32)
    for i in range(hidden_size):
        idx = i % len(pi_normalized)
        b1[i] = pi_normalized[idx] * 0.01
    
    tensors["layers.0.bias"] = b1
    
    # 4. 第二层
    w2 = np.zeros((hidden_size, hidden_size), dtype=np.float32)
    for i in range(hidden_size):
        for j in range(hidden_size):
            idx = (i * hidden_size + j) % len(pi_normalized)
            w2[i, j] = pi_normalized[idx] * 0.1
    
    tensors["layers.1.weight"] = w2
    
    b2 = np.zeros(hidden_size, dtype=np.float32)
    for i in range(hidden_size):
        idx = i % len(pi_normalized)
        b2[i] = pi_normalized[idx] * 0.01
    
    tensors["layers.1.bias"] = b2
    
    # 5. 输出层
    output_size = 16  # 16个π位分类
    w3 = np.zeros((hidden_size, output_size), dtype=np.float32)
    for i in range(hidden_size):
        for j in range(output_size):
            idx = (i * output_size + j) % len(pi_normalized)
            w3[i, j] = pi_normalized[idx] * 0.1
    
    tensors["output.weight"] = w3
    
    b3 = np.zeros(output_size, dtype=np.float32)
    for i in range(output_size):
        idx = i % len(pi_normalized)
        b3[i] = pi_normalized[idx] * 0.01
    
    tensors["output.bias"] = b3
    
    return tensors

if __name__ == "__main__":
    print("=== 生成π核心 Safetensors 模型 ===")
    print("格式: Hugging Face Safetensors")
    print("用途: 神经网络预训练权重\n")
    
    tensors = generate_pi_model()
    write_safetensors("pi_model.safetensors", tensors)
    
    print("\n模型结构:")
    print("  输入: 256维 (字节值)")
    print("  嵌入: 64维")
    print("  隐藏层: 128维 x 2")
    print("  输出: 16维 (π位预测)")
    print("\n权重来源: π的BBP公式计算位")
