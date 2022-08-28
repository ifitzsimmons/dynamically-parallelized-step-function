# Welcome to your CDK TypeScript project

This is a blank project for TypeScript development with CDK.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template

## Run the state machine

This stack builds a state machine with dynamically parallelized workflows named `OrdersSlaAlerts`. You can test this state machine with the following input:

```json
{
  "orderId": "myOrder",
  "timers": [
    {
      "expectedState": "PaymentReceived",
      "timeoutInSeconds": 30,
      "alarmName": "PaymentNotReceived"
    },
    {
      "expectedState": "OrderAccepted",
      "timeoutInSeconds": 36,
      "alarmName": "OrderNotAccepted"
    },
    {
      "expectedState": "OrderInProgress",
      "timeoutInSeconds": 42,
      "alarmName": "OrederNotStarted"
    },
    {
      "expectedState": "OrderReadyForPickup",
      "timeoutInSeconds": 48,
      "alarmName": "MissedPickupTime"
    },
    {
      "expectedState": "OrderOutForDelivery",
      "timeoutInSeconds": 54,
      "alarmName": "MissedDelivery"
    }
  ]
}
```
The `timers` list can be as long or short as you want, and you can adjust the timeout to virtually any time you want. The max wait time for a wait state in a step function is one year, so go nuts if you really want to!
