# frozen_string_literal: true

# The Concepts Study Guide (docs/study-guide/): topic pages that summarise the
# course by idea rather than by lesson, with pop-up quizzes. The plan is
# docs/lesson-plan-v3-reference.md. This plugin does two jobs; the sidebar
# placement is in lesson_nav.rb, with the rest of the sidebar.
#
# 1. Keep the section off the published site until it's ready. While
#    PUBLISHED is false, every page under study-guide/ is dropped from the
#    build, unless the environment says STUDY_GUIDE_PREVIEW=1, which is how a
#    local preview or the quiz tests build it. Set PUBLISHED to true when the
#    pilot pages are approved.
#
# 2. Index the quizzes. Every quiz is a <details class="quiz" id="..."> block
#    (the markup is in the plan's section 5). This lists each guide page's
#    quiz ids in site.data["study_guide_quizzes"], so _includes/head_custom.html
#    can hand the list to assets/js/quiz.js, which needs it to show "3 of 5
#    answered" on a page and the total on the guide's home page.
module StudyGuide
  DIR = "study-guide"
  PUBLISHED = false
  QUIZ = /<details\s+class="quiz"\s+id="([^"]+)"[^>]*>(.*?)<\/details>/m
  # A quiz counts only if it marks a right answer, as quiz.js requires;
  # anything else stays a plain block on the page, so it isn't counted.
  RIGHT_ANSWER = /^\s*[-*] \[x\]/i

  def self.preview?
    PUBLISHED || ENV["STUDY_GUIDE_PREVIEW"] == "1"
  end

  def self.guide_page?(page)
    page.path.start_with?("#{DIR}/") && page.path.end_with?(".md")
  end

  class Generator < Jekyll::Generator
    safe true
    # Before lesson_nav.rb (priority :lowest) places pages in the sidebar, and
    # after jekyll-readme-index (:low) has turned each README into its folder's
    # page.
    priority :low

    def generate(site)
      unless StudyGuide.preview?
        site.pages.reject! { |page| page.path.start_with?("#{DIR}/") }
        return
      end

      index = []
      site.pages.each do |page|
        next unless StudyGuide.guide_page?(page)

        ids = page.content.scan(QUIZ).select { |_, body| body.match?(RIGHT_ANSWER) }.map(&:first)
        next if ids.empty?

        title = page.content[/^# (.+)$/, 1].to_s.delete("`")
        index << { "url" => page.url, "title" => title, "ids" => ids }
      end
      site.data["study_guide_quizzes"] = index.sort_by { |entry| entry["url"] }
    end
  end
end
