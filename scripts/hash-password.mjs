import { randomBytes,scryptSync } from 'node:crypto';
import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
let muted=false;
const output=new Writable({write(chunk,encoding,callback){if(!muted)process.stdout.write(chunk,encoding);callback();}});
const rl=createInterface({input:process.stdin,output,terminal:process.stdin.isTTY});
process.stdout.write('Choose an owner password (12+ characters; input hidden): ');
muted=true;
const password=await rl.question('');
muted=false;rl.close();process.stdout.write('\n');
if(password.length<12 || password.length>1024){process.stderr.write('Use 12–1024 characters.\n');process.exitCode=1;}else{
 const salt=randomBytes(16).toString('hex');
 process.stdout.write('ADMIN_PASSWORD_HASH=scrypt$'+salt+'$'+scryptSync(password,salt,64).toString('hex')+'\n');
 process.stdout.write('SESSION_SECRET='+randomBytes(32).toString('hex')+'\n');
}
