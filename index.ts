import { Workflow, Step } from '@mastra/core'
import { z } from 'zod'

async function main() {
  // Step A: Increment the counter
  const incrementStep = new Step({
    id: 'increment',
    description: 'Increments the current value by 1',
    outputSchema: z.object({
      newValue: z.number(),
    }),
    execute: async ({ context }) => {
      // Get the current value (either from trigger or previous increment)
      const currentValue =
        context.getStepResult<{ newValue: number }>('increment')?.newValue ||
        context.getStepResult<{ startValue: number }>('trigger')?.startValue ||
        0

      // Increment the value
      const newValue = currentValue + 1

      console.log(`Step A: ${newValue}`)

      return { newValue }
    },
  })

  const finalStep = new Step({
    id: 'final',
    description: 'Final step',
    outputSchema: z.object({
      status: z.string(),
    }),
    execute: async ({ context }) => {
      console.log('Step B: Final')
      return { status: 'complete' }
    },
  })

  // Create the workflow
  const counterWorkflow = new Workflow({
    name: 'counter-workflow',
    triggerSchema: z.object({
      target: z.number(),
      startValue: z.number(),
    }),
  })

  // old looping structure
  // counterWorkflow
  //   .step(incrementStep)
  //   .then(checkTargetStep)
  //   .after(checkTargetStep)
  //   .step(incrementStep, {
  //     when: {
  //       ref: { step: checkTargetStep, path: 'reachedTarget' },
  //       query: { $eq: false },
  //     },
  //   })
  //   .then(checkTargetStep)
  //   .commit()

  // Define the workflow steps with cyclical dependency
  counterWorkflow
    .step(incrementStep)
    // .until(async ({ context }) => {
    //   const res = context.getStepResult<{ newValue: number }>('increment')
    //   return res?.newValue ? res.newValue >= 10 : false
    // }, incrementStep)
    .until(
      {
        ref: { step: incrementStep, path: 'newValue' },
        query: { $gte: 10 },
      },
      incrementStep
    )
    .then(finalStep)
    .commit()

  // Run the workflow
  const { runId, start } = counterWorkflow.createRun()

  console.log('Starting workflow run:', runId)

  // Example with target: 3, startValue: 0
  const result = await start({
    triggerData: {
      target: 10,
      startValue: 0,
    },
  })

  console.log('Exit')
  console.log('Results:', result.results)
}

main()
  .then(() => {
    console.log('promise resolved')
  })
  .catch((e) => {
    console.error(e)
  })
