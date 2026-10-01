import { Worker } from 'node:worker_threads'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve as resolvePath } from 'node:path'

let active = 0
export async function runSolution(source,input,endpoints,options = {}) {
  if (typeof source !== 'string' || source.length > 32768) throw new Error('Solution exceeds 32 KiB')
  if (active >= 4) throw new Error('Runner is busy; try again shortly')
  active++
  let directory
  try { directory=await mkdtemp(join(tmpdir(),'lablink-run-')) }
  catch(error) { active--; throw error }
  if(dirname(resolvePath(directory))!==resolvePath(tmpdir()) || !basename(directory).startsWith('lablink-run-')) {
    active--
    throw new Error('Unexpected sandbox directory')
  }
  return new Promise(resolve => {
    const worker = new Worker(new URL('./worker.js',import.meta.url),{
      workerData:{source,input,endpoints,directory,deadlineMs:options.deadlineMs || 15000},
      resourceLimits:{maxOldGenerationSizeMb:64,maxYoungGenerationSizeMb:16}
    })
    let finished = false
    const finish = async result => {
      if (finished) return
      finished=true; clearTimeout(timer)
      try {
        await worker.terminate()
        // directory was generated above and verified to be a dedicated child of the OS temp directory.
        await rm(directory,{recursive:true,force:true,maxRetries:3,retryDelay:50})
      } catch(error) { result={...result,error:'Sandbox cleanup failed: '+error.message} }
      finally { active--;resolve(result) }
    }
    const timer = setTimeout(() => finish({error:'Execution time limit exceeded',output:'',network:[],files:{}}),options.timeoutMs || 17000)
    worker.on('message',finish)
    worker.on('error',error=>finish({error:error.message,output:'',network:[],files:{}}))
    worker.on('exit',code=> {if (!finished) finish({error:'Runner exited with code '+code,output:'',network:[],files:{}})})
  })
}
