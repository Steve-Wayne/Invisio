import { GeminiService } from '../services/models/provider_gemini.js';
import { InvisioFlow } from '../services/WorkflowService.js';
import { initWorkflowService ,applyAnalysisResults } from './automaters.js';

export const analyzePullRequest = async (req, res) => {
    try {
        const { owner, repo, number: prNumber } = req.params;
        const workflowService = new InvisioFlow(owner);
        await workflowService.init()
        const { data: pullRequest } = await workflowService.octokit.pulls.get({ 
            owner, 
            repo, 
            pull_number: prNumber 
        });

        const diffContent = pullRequest.diff_url ? 
            await (await fetch(pullRequest.diff_url)).text() : '';

        const gemini = new GeminiService();
        const analysis = await gemini.analyze_pr(
            pullRequest.title,
            pullRequest.body || '',
            diffContent
        );

        await applyAnalysisResults(workflowService, { owner, repo, prNumber }, analysis);

        res.status(200).json({
            message: 'PR analyzed successfully',
            analysis
        });
    } catch (error) {
        console.error('Pull request analysis error:', error);
        res.status(500).json({
            error: 'Failed to analyze pull request',
            details: error.message
        });
    }
};


