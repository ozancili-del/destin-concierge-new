const placeholder = (number) => ({
  id: `story-${number}`,
  label: `Story ${number}`,
  competency: "Add competency",
  question: "Paste the interview question here.",
  situation: "Paste the Situation section here.",
  task: "Paste the Task section here.",
  action: "Paste the Action section here.",
  result: "Paste the Result section here.",
  takeaway: "Paste the short lesson or follow-up here.",
});

export const interviewStories = Array.from({ length: 10 }, (_, index) => placeholder(index + 1));

export function storyAnswer(story) {
  return [
    `Situation. ${story.situation}`,
    `Task. ${story.task}`,
    `Action. ${story.action}`,
    `Result. ${story.result}`,
    story.takeaway ? `What I learned. ${story.takeaway}` : "",
  ].filter(Boolean).join("\n\n");
}
