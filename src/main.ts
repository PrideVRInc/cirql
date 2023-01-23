import { Cirql, create, createRecord, delRecord, delRelation, eq, RecordRelation, relateRecords, select, timeNow } from '../lib';
import * as cirql from '../lib';
import { z } from 'zod';
import { count } from '../lib/writer/count';
import { query } from '../lib/writer/query';
import { letValue } from '../lib/writer/let';

(window as any).cirql = cirql;

// Create a Cirql instance and connect to the database
const database = new Cirql({
	connection: {
		namespace: 'test',
		database: 'test',
		endpoint: 'http://localhost:8000'
	},
	credentials: {
		user: 'root',
		pass: 'root'
	},
	logging: true,
	retryCount: -1
});

export const Organisation = z.object({
    id: z.string(),
    name: z.string().min(1),
	isEnabled: z.boolean(),
	createdAt: z.string()
});

async function execute() {

	const relation: RecordRelation = {
		fromTable: 'person',
		fromId: 'john',
		edge: 'knows',
		toTable: 'person',
		toId: 'david'
	}

	return await database.transaction(
		{
			query: query('INFO FOR DB').single(),
			schema: z.string(),
			validate: false
		},
		{
			query: create('organisation').setAll({
				name: 'Test',
				isEnabled: Math.random() > 0.5,
				createdAt: eq(timeNow())
			}),
			schema: Organisation
		},
		{
			query: query('SELECT * FROM test').single(),
			schema: z.any()
		},
		{
			query: count('organisation')
		},
		{
			query: select('id').from('organisation').where({ isEnabled: true }),
			schema: Organisation.pick({ id: true })
		},
		{
			query: letValue('orgs', select('name').from('organisation')),
		},
		{
			query: select().from('$orgs'),
			schema: z.any()
		},
		{
			query: createRecord('person', 'john'),
			schema: z.any(),
		},
		{
			query: createRecord('person', 'david'),
			schema: z.any()
		},
		{
			query: relateRecords(relation)
		},
		{
			query: delRelation(relation),
			schema: z.any()
		},
		{
			query: delRecord('person', 'john'),
			schema: z.any(),
		},
		{
			query: delRecord('person', 'david'),
			schema: z.any()
		},
	);

	// return database.prepare()
	// 	.create({
	// 		table: 'organisation',
	// 		schema: Organisation,
	// 		data: {
	// 			name: 'Test',
	// 			isEnabled: Math.random() > 0.5,
	// 			createdAt: eq(timeNow())
	// 		}
	// 	})
	// 	.count({
	// 		table: 'organisation',
	// 	})
	// 	.selectMany({
	// 		query: select('id').from('organisation').where({ isEnabled: true }),
	// 		schema: Organisation.pick({ id: true }),
	// 	})
	// 	.execute();
}

database.addEventListener('open', () => {
	setConnected(true);
});

database.addEventListener('close', () => {
	setConnected(false);
});

// -- Initialization --

function get(id: string) {
	return document.getElementById(id)!;
}

function setConnected(connected: boolean) {
	const text = get('status');
	const send = get('send');

	text.innerText = connected ? 'SurrealDB connection active' : 'Not connected';
	text.style.color = connected ? 'green' : 'red';
	
	if (connected) {
		send.removeAttribute('disabled');
	} else {
		send.setAttribute('disabled', '');
	}
}

async function sendQuery() {
	try {
		const results = await execute();

		let output = '';

		for (let i = 0; i < results.length; i++) {
			output += `
				<div><b>Query #${i + 1}</b></div>
				<pre>${JSON.stringify(results[i], null, 4)}</pre>
				<hr />
			`;
		}

		get('output').innerHTML = output;
	} catch(err) {
		console.error(err);
		
		get('output').innerHTML = `
			<div><b>Query failure</div>
			<pre style="color: red">${JSON.stringify(err, null, 4)}</pre>
		`;
	}

}

setConnected(false);

get('connect').addEventListener('click', () => {
	database.connect();
});

get('disconnect').addEventListener('click', () => {
	database.disconnect();
});

get('send').addEventListener('click', () => {
	sendQuery();
});