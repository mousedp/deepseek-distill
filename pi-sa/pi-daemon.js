/**
 * π死循环守护进程
 * 24小时不间断运行，系统重启后自动恢复
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PIDaemon {
    constructor() {
        this.process = null;
        this.restartCount = 0;
        this.logFile = path.join(__dirname, 'pi-daemon.log');
    }
    
    log(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(this.logFile, logEntry);
        console.log(logEntry.trim());
    }
    
    start() {
        this.log('=== π死循环守护进程启动 ===');
        this.log('模式: 24小时不间断');
        this.log('策略: 崩溃自动重启');
        
        this.spawnProcess();
        
        // 处理守护进程信号
        process.on('SIGINT', () => {
            this.log('收到终止信号，停止守护');
            if (this.process) {
                this.process.kill('SIGINT');
            }
            process.exit(0);
        });
    }
    
    spawnProcess() {
        const scriptPath = path.join(__dirname, 'pi-core-sa.js');
        
        this.log(`启动π死循环进程 (重启次数: ${this.restartCount})`);
        
        this.process = spawn('node', [scriptPath], {
            stdio: 'inherit',
            detached: false
        });
        
        this.process.on('exit', (code, signal) => {
            this.log(`π死循环进程退出 (code: ${code}, signal: ${signal})`);
            
            // 自动重启
            this.restartCount++;
            const delay = Math.min(5000 * this.restartCount, 30000); // 最多30秒延迟
            
            this.log(`${delay/1000}秒后自动重启...`);
            setTimeout(() => this.spawnProcess(), delay);
        });
        
        this.process.on('error', (err) => {
            this.log(`进程错误: ${err.message}`);
        });
    }
}

// 启动守护进程
const daemon = new PIDaemon();
daemon.start();
