import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as sfnTasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { join } from 'path';

export class ParellizedStepFunctionsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const createTimers = new lambda.Function(this, 'CreateOrderTimeouts', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'calculate-timers.handler',
      code: lambda.Code.fromAsset(join(__dirname, 'lambdas')),
    });

    const checkTimeout = new lambda.Function(this, 'CheckOrderStatus', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'check-status.handler',
      code: lambda.Code.fromAsset(join(__dirname, 'lambdas')),
    });

    const successState = new sfn.Succeed(this, 'Timers Checked');

    const calculateTimerTask = new sfnTasks.LambdaInvoke(this, 'CreateTimers', {
      lambdaFunction: createTimers,
      payload: sfn.TaskInput.fromObject({
        orderId: sfn.JsonPath.stringAt('$.orderId'),
        createdTimestamp: sfn.JsonPath.numberAt('$.createdTimestamp'),
      }),
      resultPath: sfn.JsonPath.stringAt('$.timers')
    });

    const checktimeoutTask = new sfnTasks.LambdaInvoke(this, 'CheckTimeout', {
      lambdaFunction: checkTimeout,
      payload: sfn.TaskInput.fromObject({
        orderId: sfn.JsonPath.stringAt('$.orderId'),
        expectedState: sfn.JsonPath.stringAt('$.expectedState'),
        alarmName: sfn.JsonPath.stringAt('$.alarmName'),
      }),
      resultPath: "$"
    });

    const waitState = new sfn.Wait(this, 'Wait for Timer', {
      time: sfn.WaitTime.timestampPath('$.waitTimestamp'),
    });

    const map = new sfn.Map(this, 'Parallelized timers', {
      inputPath: sfn.JsonPath.entirePayload,
      itemsPath: sfn.JsonPath.stringAt('$.timers.Payload'),
      maxConcurrency: 50,
    });

    map
      .iterator(waitState)
      .iterator(checktimeoutTask)

    const definition = calculateTimerTask.next(map).next(successState);

    new sfn.StateMachine(this, 'OmsTimeoutAlerts', {
      definition,
    });
  }
}
