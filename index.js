// Require the framework and instantiate it

// ESM
import Fastify from 'fastify'
import fastifyView from '@fastify/view'
import ejs from 'ejs'
import NSAPI from 'ns-api'
const apikey = "REDACTED"
const ns = new NSAPI ({
    key: 'REDACTED',
});
  
function formatSeconds(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    let result = '';
    if (seconds != 0) {
        result += '+';
        if (hours > 0) {
            result += `${hours}h`;
        }
    
        if (minutes > 0) {
            result += `${minutes}m`;
        }
    
        if (remainingSeconds > 0 || (hours === 0 && minutes === 0)) {
            result += `${remainingSeconds}s`;
        }    
    }
    return result;
}

const fastify = Fastify({
  logger: true
})

fastify.register(fastifyView, {
    engine: {
        ejs: ejs
    }
})
  
// Declare a route
fastify.get('/', function (request, reply) {
  reply.send({ hello: 'world' })
})

fastify.get('/info/menu.jsp', function (request, reply) {
    const data = { text: "Hello!"}
    reply.view('menu.ejs', data)
})
fastify.get('/info/treininfo.jsp', async function (request, reply) {
    const ritnummer = request.query["treinnummer"];
    // let j = await ns.getJourney ({
    //     train: ritnummer,
    // })
    // if (!j.ok && potnum) {
    //     console.log("TEST")
    //     j = await ns.getJourney(potnum)
    // }
    // console.log(j)
    var j
    j = await ns.getJourney({train: ritnummer}).catch( async function() {
        let potnum = await (await fetch("https://gateway.apiportal.ns.nl/virtual-train-api/v1/ritnummer/"+ritnummer, {headers: {"Ocp-Apim-Subscription-Key": apikey}})).text()
        return await ns.getJourney({train: potnum})
    })
    console.log(j)
    //parse numers
    let parts = j.stops[0].plannedStock.trainParts
    .map(part => part.stockIdentifier)
    .join(',');

    //parse stations and hide passed if needed
    let stations = ''
    for (let i = 0; i < j.stops.length; i++) {
        // if (j.stops[i].departures[0]) {
        //     console.log("T")
        //     time = j.stops[i].departures[0]
        // } else if (j.stops[i].arrivals[0]) {
        //     console.log("E")
        //     time = j.stops[i].arrivals[0]
        // }
        let time = j.stops[i].departures[0] ?? j.stops[i].arrivals[0] ?? undefined
        if (time) {
            let timee = time.plannedTime.substr(11, 5)+formatSeconds(time.delayInSeconds)
            stations += `<p style='float:left;font-weight:Bold'>${j.stops[i].stop.name}</p><br /><p style='float:left'>${timee}</p><p style='float:right'>${time.actualTrack}</p><br />`
        }

    }
    let titledata = j.stops[0].departures[0]
    let title = `${titledata.product.operatorName} ${titledata.product.categoryCode} ${titledata.product.number}`
    const data = { title: title, body: stations, materiaal: j.stops[0].plannedStock, materiaalparts: parts}
    reply.view('reisinfo.ejs', data)
    return reply
})

// Run the server!
fastify.listen({ port: 3000, host: "::" }, function (err, address) {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }
  // Server is now listening on ${address}
})

