package main

import (
	"fmt"
	"math"
	"os"
	"os/signal"
	"syscall"
	"time"
)

// NeuralPiCore - 为神经网络设计的π计算核心
// 输出标准化向量，可直接输入神经网络
type NeuralPiCore struct {
	n          int64
	window     []float64
	windowSize int
}

// NewNeuralPiCore 创建神经网络友好的π核心
func NewNeuralPiCore(windowSize int) *NeuralPiCore {
	return &NeuralPiCore{
		n:          0,
		window:     make([]float64, windowSize),
		windowSize: windowSize,
	}
}

// bbpDigit 使用BBP公式计算π的第n位十六进制
func (p *NeuralPiCore) bbpDigit(n int64) int {
	x := 0.0
	for k := int64(0); k <= n; k++ {
		ak := 1.0 / math.Pow(16, float64(n-k))
		bk := (4.0/(8*float64(k)+1)) - (2.0/(8*float64(k)+4)) - (1.0/(8*float64(k)+5)) - (1.0/(8*float64(k)+6))
		x += ak * bk
	}
	return int(math.Floor((x - math.Floor(x)) * 16))
}

// ComputeNeuralVector 计算神经网络输入向量
func (p *NeuralPiCore) ComputeNeuralVector() []float64 {
	digit := p.bbpDigit(p.n)
	p.n++
	
	// 标准化到[-1,1]
	normalized := (float64(digit) / 7.5) - 1.0
	
	// 滑动窗口
	p.window = append(p.window[1:], normalized)
	
	return p.window
}

// GetFeatureVector 提取特征向量
func (p *NeuralPiCore) GetFeatureVector() []float64 {
	vector := p.ComputeNeuralVector()
	
	// 统计特征
	var sum, mean float64
	for _, v := range vector {
		sum += v
	}
	mean = sum / float64(len(vector))
	
	var variance float64
	for _, v := range vector {
		variance += math.Pow(v-mean, 2)
	}
	stdDev := math.Sqrt(variance / float64(len(vector)))
	
	// 扩展特征
	features := append(vector, mean, stdDev, vector[0], vector[len(vector)-1])
	return features
}

// NeuralLoop - 神经网络训练循环
type NeuralLoop struct {
	core      *NeuralPiCore
	running   bool
	batchSize int
	callback  func([][]float64)
}

// NewNeuralLoop 创建神经网络循环
func NewNeuralLoop(core *NeuralPiCore, batchSize int) *NeuralLoop {
	return &NeuralLoop{
		core:      core,
		batchSize: batchSize,
	}
}

// SetCallback 设置数据回调
func (n *NeuralLoop) SetCallback(cb func([][]float64)) {
	n.callback = cb
}

// Start 启动神经网络数据生成
func (n *NeuralLoop) Start() {
	n.running = true
	
	fmt.Println("=== 神经网络π数据生成器启动 ===")
	fmt.Println("用途: 为神经网络提供标准化输入数据")
	fmt.Println("输出: 浮点向量 [-1,1] 范围")
	fmt.Println("=====================================\n")
	
	batch := make([][]float64, 0, n.batchSize)
	
	go func() {
		for n.running {
			vector := n.core.GetFeatureVector()
			batch = append(batch, vector)
			
			if len(batch) >= n.batchSize {
				if n.callback != nil {
					n.callback(batch)
				}
				batch = batch[:0]
			}
			
			time.Sleep(time.Microsecond * 100)
		}
	}()
	
	// 等待中断
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan
	
	n.running = false
	fmt.Println("\n[Neural] 数据生成停止")
}

func main() {
	// 窗口大小64，适合大多数神经网络
	core := NewNeuralPiCore(64)
	loop := NewNeuralLoop(core, 100)
	
	loop.SetCallback(func(batch [][]float64) {
		fmt.Printf("[Neural] 生成批次: %d 个样本, 每个样本 %d 维\n",
			len(batch), len(batch[0]))
		
		var totalSum float64
		for _, vec := range batch {
			for _, v := range vec {
				totalSum += v
			}
		}
		mean := totalSum / float64(len(batch)*len(batch[0]))
		fmt.Printf("[Neural] 批次均值: %.6f\n", mean)
	})
	
	loop.Start()
}
