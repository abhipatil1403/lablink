import { Worker } from 'node:worker_threads'

let active = 0
export function runSolution(source,input,endpoints,options = {}) {
  if (typeof source !== 'string' || source.length > 32768) throw new Error('Solution exceeds 32 KiB')
  if (active >= 4) throw new Error('Runner is busy; try again shortly')
  active++
  return new Promise(resolve => {
    const worker = new Worker(new URL('./worker.js',import.meta.url),{
      workerData:{source,input,endpoints,deadlineMs:options.deadlineMs || 15000},
      resourceLimits:{maxOldGenerationSizeMb:64,maxYoungGenerationSizeMb:16}
    })
    let finished = false
    const finish = result => {
      if (finished) return
      finished=true; active--; clearTimeout(timer); worker.terminate(); resolve(result)
    }
    const timer = setTimeout(() => finish({error:'Execution time limit exceeded',output:'',network:[],files:{}}),options.timeoutMs || 17000)
    worker.on('message',finish)
    worker.on('error',error=>finish({error:error.message,output:'',network:[],files:{}}))
    worker.on('exit',code=> {if (!finished) finish({error:'Runner exited with code '+code,output:'',network:[],files:{}})})
  })
}
