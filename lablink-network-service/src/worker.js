import { parentPort, workerData } from 'node:worker_threads'
import { newAsyncContext } from 'quickjs-emscripten'
import { capabilities } from './capabilities.js'

const { source, input, endpoints, deadlineMs = 15000 } = workerData
const env = capabilities(endpoints)
const output = []
let context
try {
  context = await newAsyncContext()
  context.runtime.setMemoryLimit(16 * 1024 * 1024)
  context.runtime.setMaxStackSize(512 * 1024)
  const deadline = Date.now() + deadlineMs
  context.runtime.setInterruptHandler(() => Date.now() > deadline)
  const bridge = context.newAsyncifiedFunction('__call', async (op, raw) => {
    try {
      const result = await env.call(context.getString(op), JSON.parse(context.getString(raw)))
      return context.newString(JSON.stringify({value:result}))
    } catch (error) { return context.newString(JSON.stringify({error:error.message})) }
  })
  context.setProp(context.global,'__call',bridge); bridge.dispose()
  const print = context.newFunction('__print', value => {
    if (output.join('\n').length > 16000) throw new Error('Output limit exceeded')
    output.push(context.getString(value))
    return context.undefined
  })
  context.setProp(context.global,'__print',print); print.dispose()
  const setup = `
    const invoke = (op,...args) => {
      const result=JSON.parse(__call(op,JSON.stringify(args)));
      if (result.error) throw new Error(result.error);
      return result.value;
    };
    const tcp=Object.freeze({connect:s=>invoke('tcp.connect',s),send:(id,line)=>invoke('tcp.send',id,line),read:id=>invoke('tcp.read',id),close:id=>invoke('tcp.close',id)});
    const udp=Object.freeze({exchange:updates=>invoke('udp.exchange',updates)});
    const http=Object.freeze({request:(path,method='GET')=>invoke('http.request',path,method),probe:name=>invoke('http.probe',name)});
    const dns=Object.freeze({lookup:name=>invoke('dns.lookup',name)});
    const save=(name,content)=>invoke('save',name,content);
    const sha256=content=>invoke('sha256',content);
    const decodeBase64=content=>invoke('decodeBase64',content);
    const print=value=>__print(typeof value==='string'?value:JSON.stringify(value));
  `
  const result = await context.evalCodeAsync(setup + '\n' + source + '\nJSON.stringify(solve(' + JSON.stringify(input) + '));','solution.js')
  if (result.error) {
    const error = context.dump(result.error); result.error.dispose()
    throw new Error(error.message || String(error))
  }
  const raw = context.getString(result.value); result.value.dispose()
  if (raw.length > 32768) throw new Error('Result limit exceeded')
  parentPort.postMessage({value:JSON.parse(raw),output:output.join('\n'),network:env.log,files:env.files})
} catch (error) {
  parentPort.postMessage({error:error.message,output:output.join('\n'),network:env.log,files:env.files})
} finally {
  env.close()
  context?.dispose()
}
