const alarmList = [
  {
    alarmName: 'AlarmState1',
    timeFromCreateInMinutes: 0.5,
    expectedState: 'State1',
  },
  {
    alarmName: 'AlarmState2',
    timeFromCreateInMinutes: 0.6,
    expectedState: 'State2',
  },
  {
    alarmName: 'AlarmState3',
    timeFromCreateInMinutes: 0.7,
    expectedState: 'State3',
  },
  {
    alarmName: 'AlarmState4',
    timeFromCreateInMinutes: 0.8,
    expectedState: 'State4',
  },
  {
    alarmName: 'AlarmState5',
    timeFromCreateInMinutes: 0.9,
    expectedState: 'State5',
  },
]

const convertMinutesToMilliseconds = (minute) => {
  const secondsInMinute = 60;
  const millisecondsInSecond = 1000;

  return minute * secondsInMinute * millisecondsInSecond;
}

exports.handler = async function (event, context) {
  console.log(`Create event: ${JSON.stringify(event)}`);
  const { orderId, createdTimestamp } = event;

  const waitTimeObjects = alarmList.map(alarmObject => {
    const timeToWaitInMs = convertMinutesToMilliseconds(alarmObject.timeFromCreateInMinutes);
    const waitTimestamp = new Date(createdTimestamp + timeToWaitInMs).toISOString();

    return { ...alarmObject, waitTimestamp, orderId };
  })

  return waitTimeObjects;
};