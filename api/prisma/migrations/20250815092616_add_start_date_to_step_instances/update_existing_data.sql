-- 既存のstep_instancesに開始日を設定するスクリプト
-- 期限日から7営業日前を開始日として設定（簡易版）

UPDATE step_instances
SET start_date_utc = CASE
    WHEN due_date_utc IS NOT NULL THEN
        -- 土日を考慮して10日前を設定（7営業日の近似値）
        due_date_utc - INTERVAL '10 days'
    ELSE
        -- 期限日がない場合は作成日を使用
        created_at
    END
WHERE start_date_utc IS NULL;