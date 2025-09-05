import { GeminiService } from '../services/provider_gemini.js';
import { InvisioFlow } from '../services/WorkflowService.js';
import { initWorkflowService } from './automaters.js';
import { applyAnalysisResults } from './automaters.js';

export const analyzePullRequest = async (req, res) => {
    try {
        const { owner, repo, number: prNumber } = req.params;
        const workflowService = new InvisioFlow(owner);
        await workflowService.init()
        
        // Get complete PR details in one call
        const { data: pullRequest } = await workflowService.octokit.pulls.get({ 
            owner, 
            repo, 
            pull_number: prNumber 
        });

        // Fetch diff content
        const diffContent = pullRequest.diff_url ? 
            await (await fetch(pullRequest.diff_url)).text() : '';

        // Analyze with Gemini
        const gemini = new GeminiService();
        const analysis = await gemini.analyze_pr(
            pullRequest.title,
            pullRequest.body || '',
            diffContent
        );

        // Apply results
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
