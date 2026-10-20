import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readIcalEvents,sha256} from '../supabase/functions/hub-notifications/calendar.ts';
const sample=`BEGIN:VCALENDAR
BEGIN:VEVENT
UID:event1@example.com
SUMMARY:Compito\\, esercizi
DTSTART;VALUE=DATE:20261028
END:VEVENT
BEGIN:VEVENT
UID:cancelled@example.com
SUMMARY:Cancel me
STATUS:CANCELLED
END:VEVENT
BEGIN:VEVENT
UID:recurrence@example.com
RECURRENCE-ID;VALUE=DATE:20261101
SUMMARY:Interrogazione di\\nMatematica
DTSTART;VALUE=DATE:20261101
END:VEVENT
END:VCALENDAR`;
test('calendar parser skips cancelled entries and displays date',()=>{
 const v=readIcalEvents(sample);
 assert.equal(v.length,2);
 assert.equal(v[0].title,'Compito, esercizi');
 assert.equal(v[0].startLabel,'28/10/2026');
 assert.equal(v[1].uid,'recurrence@example.com:20261101');
});
test('invalid calendar rejected',()=>assert.throws(()=>readIcalEvents('hello')));
test('UID digest is stable',async()=>assert.equal(await sha256('test'),await sha256('test')));