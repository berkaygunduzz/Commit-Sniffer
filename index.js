import { Config } from "./const/config.js";
import { publishPrReview } from "./request/request.js";
import { process_pr } from "./utils/process_pr.js";
/**
 * This is the main entrypoint to your Probot app
 * @param {import('probot').Probot} app
 */
export default (app) => {
    // Load configs
    const config = new Config();

    app.log.info("CommitSniffer is loaded!");

    // console.log(getMethodLengths());
    // publishPrReview("CommitSniffer", "literate-fortnight", 11, null);

    app.on("issues.opened", async (context) => {
        const issueComment = context.issue({
            body: "Thanks for opening this issue!",
        });

        createComment(context, "slm");
        return;
    });

    app.on(
        [
            "pull_request.opened",
            "pull_request.synchronize",
            "pull_request.edited", // edited action should be removed, it is only for test purposes
        ],
        async (context) => {
            // Process PR and check for code smells
            process_pr(context)
                .then((result) => {
                    // Create a comment TODO this part should be updated so that it becomes compatible with other fearutes
                    result.forEach((msgGroup) => {
                        if (msgGroup.length == 0) {
                            return;
                        }

                        let msg = msgGroup;
                        if (Array.isArray(msgGroup)) {
                            msg = msgGroup.join("\n");
                        } else {
                        }

                        // createComment(context, msg); // uncomment this
                        createReview(context, "");
                    });
                })
                .catch((error) => {
                    console.error("Error processing PR:", error);
                    const prComment = context.issue({
                        body: "We cannot process your PR right now :(\nPlease try again later.",
                    });
                    return context.octokit.issues.createComment(prComment);
                });
        }
    );

    function createComment(context, msg) {
        const comment = context.issue({
            body: msg,
        });
        return context.octokit.issues.createComment(comment);
    }

    function createReview(context, msg) {
        const owner = context.payload.repository.owner.login;
        const repo = context.payload.repository.name;
        const pull_number = context.payload.number;

        const review = context.octokit.pulls.createReview({
            owner: owner,
            repo: repo,
            pull_number: pull_number,
            body: "Please update your branch according to suggested changes!",
            event: "REQUEST_CHANGES", // Specify the review action (APPROVE, REQUEST_CHANGES, or COMMENT)
            comments: [
                {
                    position: 6,
                    path: "src/Client.java", // Path to the file you want to comment on
                    body: "Consider simplifying the expression `if (isAvailable === false)` to `if (isAvailable)`. The variable `isAvailable` is already a boolean value, so there's no need for the explicit comparison to `false`. This simplification enhances readability and adheres to best practices for concise code.",
                    // You can optionally specify comments[].position if needed
                },
                // Add more comments if necessary
            ],
        });
    }

    // For more information on building apps:
    // https://probot.github.io/docs/

    // To get your app running against GitHub, see:
    // https://probot.github.io/docs/development/
};
